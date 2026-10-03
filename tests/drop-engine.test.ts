import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  DropEngineError,
  joinDrop,
  parseDropJoinRequest,
  participantRedisKey,
  type DropEngineDependencies,
  type ParticipantState,
} from "../lib/drop-engine.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function activeDrop() {
  return {
    status: "ACTIVE" as const,
    startsAt: new Date("2025-01-01T00:00:00.000Z"),
    endsAt: null,
  };
}

function createDependencies() {
  const participations = new Map<string, ParticipantState>();
  const cached = new Map<string, ParticipantState>();

  const dependencies: DropEngineDependencies = {
    getDrop: async () => activeDrop(),
    upsertParticipation: async (input) => {
      const key = `${input.dropId}:${input.clerkId}`;
      const existing = participations.get(key);

      if (existing) {
        return { participant: existing, created: false };
      }

      const participant: ParticipantState = {
        participantId: input.participantId,
        dropId: input.dropId,
        status: "JOINED",
      };
      participations.set(key, participant);
      return { participant, created: true };
    },
    cacheParticipant: async (key, participant) => {
      cached.set(key, participant);
    },
    createParticipantId: () => `p_${randomUUID().replaceAll("-", "")}`,
    now: () => NOW,
  };

  return { dependencies, participations, cached };
}

test("validates the join request body", () => {
  assert.deepEqual(parseDropJoinRequest({ dropId: "fairdrop-demo" }), {
    dropId: "fairdrop-demo",
  });
  assert.equal(parseDropJoinRequest({}), null);
  assert.equal(parseDropJoinRequest({ dropId: "" }), null);
  assert.equal(parseDropJoinRequest({ dropId: 42 }), null);
  assert.equal(parseDropJoinRequest({ dropId: " invalid " }), null);
  assert.equal(parseDropJoinRequest({ dropId: "INVALID" }), null);
});

test("returns DROP_NOT_FOUND for an unknown drop", async () => {
  const { dependencies } = createDependencies();
  dependencies.getDrop = async () => null;

  await assert.rejects(joinDrop("missing", "user_1", dependencies), (error) => {
    return error instanceof DropEngineError && error.code === "DROP_NOT_FOUND";
  });
});

test("rejects inactive, future, and ended drops", async () => {
  for (const drop of [
    { ...activeDrop(), status: "INACTIVE" as const },
    { ...activeDrop(), startsAt: new Date("2027-01-01T00:00:00.000Z") },
    { ...activeDrop(), endsAt: new Date("2025-12-31T23:59:59.000Z") },
  ]) {
    const { dependencies } = createDependencies();
    dependencies.getDrop = async () => drop;

    await assert.rejects(joinDrop("fairdrop-demo", "user_1", dependencies), (error) => {
      return error instanceof DropEngineError && error.code === "DROP_NOT_ACTIVE";
    });
  }
});

test("first and repeated joins return one stable participant", async () => {
  const { dependencies, participations, cached } = createDependencies();
  const first = await joinDrop("fairdrop-demo", "user_1", dependencies);
  const repeated = await joinDrop("fairdrop-demo", "user_1", dependencies);

  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.equal(repeated.participant.participantId, first.participant.participantId);
  assert.equal(participations.size, 1);
  assert.equal(cached.size, 1);
});

test("a burst of repeated joins creates one participation", async () => {
  const { dependencies, participations } = createDependencies();
  const results = await Promise.all(
    Array.from({ length: 100 }, () => joinDrop("fairdrop-demo", "user_1", dependencies))
  );

  assert.equal(participations.size, 1);
  assert.equal(new Set(results.map((result) => result.participant.participantId)).size, 1);
  assert.equal(results.filter((result) => result.created).length, 1);
});

test("different users receive distinct participation records", async () => {
  const { dependencies, participations } = createDependencies();
  const results = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      joinDrop("fairdrop-demo", `user_${index}`, dependencies)
    )
  );

  assert.equal(participations.size, 25);
  assert.equal(new Set(results.map((result) => result.participant.participantId)).size, 25);
});

test("Redis failure does not invalidate durable participation", async () => {
  const { dependencies, participations } = createDependencies();
  let cacheErrors = 0;
  dependencies.cacheParticipant = async () => {
    throw new Error("Redis unavailable");
  };
  dependencies.onCacheError = () => {
    cacheErrors += 1;
  };

  const result = await joinDrop("fairdrop-demo", "user_1", dependencies);

  assert.equal(result.created, true);
  assert.equal(participations.size, 1);
  assert.equal(cacheErrors, 1);
});

test("MongoDB failure prevents Redis from being treated as durable state", async () => {
  const { dependencies } = createDependencies();
  let cacheWrites = 0;
  dependencies.upsertParticipation = async () => {
    throw new Error("MongoDB unavailable");
  };
  dependencies.cacheParticipant = async () => {
    cacheWrites += 1;
  };

  await assert.rejects(joinDrop("fairdrop-demo", "user_1", dependencies));
  assert.equal(cacheWrites, 0);
});

test("builds the namespaced participant Redis key", () => {
  assert.equal(
    participantRedisKey("development", "fairdrop-demo", "user_123"),
    "fairdrop:development:participant:fairdrop-demo:user_123"
  );
});
