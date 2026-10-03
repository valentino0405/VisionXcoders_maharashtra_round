import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  enterQueue,
  QueueEngineError,
  type QueueEngineDependencies,
  type QueueState,
} from "../lib/queue-engine.ts";
import { issueQueueToken, verifyQueueToken } from "../lib/queue-token.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const TOKEN_SECRET = "test-only-queue-token-secret-32-characters";

function createDependencies() {
  const participants = new Map<string, string>();
  const reservations = new Map<string, QueueState>();
  const entries = new Map<string, QueueState>();
  const ordered = new Set<string>();
  let sequence = 0;

  const dependencies: QueueEngineDependencies = {
    getDrop: async () => ({
      status: "ACTIVE",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: null,
    }),
    getParticipant: async (dropId, clerkId) => {
      const key = `${dropId}:${clerkId}`;
      const participantId = participants.get(key) ?? `p_${clerkId}`;
      participants.set(key, participantId);
      return { participantId };
    },
    getQueueEntry: async (dropId, participantId) =>
      entries.get(`${dropId}:${participantId}`) ?? null,
    reserveQueueEntry: async (input) => {
      const key = `${input.dropId}:${input.participantId}`;
      const existing = reservations.get(key);
      if (existing) return existing;

      sequence += 1;
      const queue: QueueState = {
        ...input,
        sequence,
        position: sequence,
        status: "WAITING",
      };
      reservations.set(key, queue);
      return queue;
    },
    persistQueueEntry: async (input) => {
      const key = `${input.dropId}:${input.participantId}`;
      const existing = entries.get(key);
      if (existing) return { queue: existing, created: false };
      entries.set(key, input);
      return { queue: input, created: true };
    },
    finalizeQueueEntry: async (queue) => {
      ordered.add(`${queue.dropId}:${queue.participantId}`);
      return ordered.size;
    },
    createQueueEntryId: () => `q_${randomUUID().replaceAll("-", "")}`,
    now: () => NOW,
  };

  return { dependencies, reservations, entries };
}

test("one participant receives one stable queue entry", async () => {
  const { dependencies, entries } = createDependencies();
  const first = await enterQueue("fairdrop-demo", "user_1", dependencies);
  const repeated = await enterQueue("fairdrop-demo", "user_1", dependencies);

  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.queue, first.queue);
  assert.equal(entries.size, 1);
});

test("100 concurrent same-participant requests share one sequence", async () => {
  const { dependencies, entries, reservations } = createDependencies();
  const results = await Promise.all(
    Array.from({ length: 100 }, () => enterQueue("fairdrop-demo", "user_1", dependencies))
  );

  assert.equal(entries.size, 1);
  assert.equal(reservations.size, 1);
  assert.equal(new Set(results.map((result) => result.queue.queueEntryId)).size, 1);
  assert.equal(new Set(results.map((result) => result.queue.sequence)).size, 1);
  assert.equal(new Set(results.map((result) => result.queue.position)).size, 1);
});

for (const userCount of [20, 100]) {
  test(`${userCount} concurrent participants receive unique sequences`, async () => {
    const { dependencies, entries } = createDependencies();
    const results = await Promise.all(
      Array.from({ length: userCount }, (_, index) =>
        enterQueue("fairdrop-demo", `user_${index}`, dependencies)
      )
    );

    assert.equal(entries.size, userCount);
    assert.equal(new Set(results.map((result) => result.queue.sequence)).size, userCount);
    assert.equal(new Set(results.map((result) => result.queue.queueEntryId)).size, userCount);
  });
}

test("a participant is required", async () => {
  const { dependencies } = createDependencies();
  dependencies.getParticipant = async () => null;

  await assert.rejects(enterQueue("fairdrop-demo", "user_1", dependencies), (error) => {
    return error instanceof QueueEngineError && error.code === "NOT_A_PARTICIPANT";
  });
});

test("Redis reservation failure does not persist a queue entry", async () => {
  const { dependencies, entries } = createDependencies();
  dependencies.reserveQueueEntry = async () => {
    throw new Error("Redis unavailable");
  };

  await assert.rejects(enterQueue("fairdrop-demo", "user_1", dependencies));
  assert.equal(entries.size, 0);
});

test("retry after MongoDB failure reuses the Redis reservation", async () => {
  const { dependencies, reservations } = createDependencies();
  const persist = dependencies.persistQueueEntry;
  let shouldFail = true;
  dependencies.persistQueueEntry = async (input) => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error("MongoDB unavailable");
    }
    return persist(input);
  };

  await assert.rejects(enterQueue("fairdrop-demo", "user_1", dependencies));
  const retried = await enterQueue("fairdrop-demo", "user_1", dependencies);

  assert.equal(reservations.size, 1);
  assert.equal(retried.queue.sequence, 1);
});

test("queue tokens reject tampering and identity mismatches", () => {
  const identity = {
    dropId: "fairdrop-demo",
    participantId: "p_user_1",
    queueEntryId: "q_entry_1",
  };
  const token = issueQueueToken(identity, TOKEN_SECRET, NOW);
  const later = new Date(NOW.getTime() + 60_000);

  assert.ok(verifyQueueToken(token, identity, TOKEN_SECRET, later));
  assert.equal(verifyQueueToken(`${token}x`, identity, TOKEN_SECRET, later), null);
  assert.equal(
    verifyQueueToken(token, { ...identity, participantId: "p_user_2" }, TOKEN_SECRET, later),
    null
  );
  assert.equal(
    verifyQueueToken(token, { ...identity, dropId: "another-drop" }, TOKEN_SECRET, later),
    null
  );
  assert.equal(
    verifyQueueToken(token, { ...identity, queueEntryId: "q_entry_2" }, TOKEN_SECRET, later),
    null
  );
});
