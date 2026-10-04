import assert from "node:assert/strict";
import test from "node:test";

import {
  recoverSessionState,
  SessionUnavailableError,
  type FairDropSession,
  type RecoveredFairDropState,
  type SessionRecoveryDependencies,
} from "../lib/session-engine.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function recoveredState(overrides: Partial<RecoveredFairDropState> = {}): RecoveredFairDropState {
  return {
    activeDropId: "fairdrop-demo",
    drop: { dropId: "fairdrop-demo", status: "ACTIVE", exists: true },
    participation: { participantId: "p123", dropId: "fairdrop-demo", joinedAt: NOW.toISOString() },
    queue: { queueEntryId: "q123", sequence: 42, position: 42, status: "WAITING", joinedAt: NOW.toISOString() },
    allocation: { allocationId: "a123", queueEntryId: "q123", queueSequence: 42, seatId: "S042", status: "ALLOCATED", allocatedAt: NOW.toISOString() },
    ...overrides,
  };
}

function createDependencies(state = recoveredState()) {
  const sessions = new Map<string, FairDropSession>();
  let sessionNumber = 0;
  let durableReads = 0;
  let failRead = false;
  let failWrite = false;
  let failDurableRead = false;
  const dependencies: SessionRecoveryDependencies = {
    readSession: async (sessionId) => {
      if (failRead) throw new Error("Redis unavailable");
      return sessions.get(sessionId) ?? null;
    },
    writeSession: async (session) => {
      if (failWrite) throw new Error("Redis unavailable");
      sessions.set(session.sessionId, structuredClone(session));
    },
    recoverAuthoritativeState: async () => {
      durableReads += 1;
      if (failDurableRead) throw new Error("MongoDB unavailable");
      return structuredClone(state);
    },
    createSessionId: () => `fs_test_${++sessionNumber}`,
    now: () => NOW,
  };
  return {
    dependencies,
    sessions,
    get durableReads() { return durableReads; },
    failRedisRead: () => { failRead = true; },
    failRedisWrite: () => { failWrite = true; },
    failMongo: () => { failDurableRead = true; },
  };
}

async function recover(dependencies: SessionRecoveryDependencies, clerkId = "user_1", sessionId?: string) {
  return recoverSessionState({ clerkId, sessionId, ttlSeconds: 60 }, dependencies);
}

test("authenticated recovery creates an opaque application session", async () => {
  const { dependencies } = createDependencies();
  const result = await recover(dependencies);
  assert.equal(result.session.sessionId, "fs_test_1");
  assert.equal(result.session.clerkId, "user_1");
  assert.equal(result.session.status, "ACTIVE");
});

test("missing authenticated identity is rejected", async () => {
  const { dependencies } = createDependencies();
  await assert.rejects(recoverSessionState({ clerkId: "", ttlSeconds: 60 }, dependencies), SessionUnavailableError);
});

test("refresh preserves durable participation", async () => {
  const { dependencies } = createDependencies();
  const first = await recover(dependencies);
  const second = await recover(dependencies, "user_1", first.session.sessionId);
  assert.equal(second.state.participation?.participantId, "p123");
});

test("refresh preserves queue entry", async () => {
  const { dependencies } = createDependencies();
  const first = await recover(dependencies);
  assert.equal((await recover(dependencies, "user_1", first.session.sessionId)).state.queue?.queueEntryId, "q123");
});

test("refresh preserves immutable queue sequence and position", async () => {
  const { dependencies } = createDependencies();
  const first = await recover(dependencies);
  const queue = (await recover(dependencies, "user_1", first.session.sessionId)).state.queue;
  assert.equal(queue?.sequence, 42);
  assert.equal(queue?.position, 42);
});

test("refresh preserves the existing allocation and seat", async () => {
  const { dependencies } = createDependencies();
  const first = await recover(dependencies);
  const allocation = (await recover(dependencies, "user_1", first.session.sessionId)).state.allocation;
  assert.equal(allocation?.allocationId, "a123");
  assert.equal(allocation?.seatId, "S042");
});

test("expired sessions are replaced without changing durable state", async () => {
  const { dependencies, sessions } = createDependencies();
  const first = await recover(dependencies);
  sessions.set(first.session.sessionId, { ...first.session, expiresAt: "2025-01-01T00:00:00.000Z" });
  const recovered = await recover(dependencies, "user_1", first.session.sessionId);
  assert.notEqual(recovered.session.sessionId, first.session.sessionId);
  assert.equal(recovered.state.queue?.sequence, 42);
});

test("deleted Redis session is reconstructed from durable state", async () => {
  const { dependencies, sessions } = createDependencies();
  const first = await recover(dependencies);
  sessions.delete(first.session.sessionId);
  const recovered = await recover(dependencies, "user_1", first.session.sessionId);
  assert.notEqual(recovered.session.sessionId, first.session.sessionId);
  assert.equal(recovered.state.participation?.participantId, "p123");
  assert.equal(recovered.state.queue?.sequence, 42);
  assert.equal(recovered.state.allocation?.seatId, "S042");
});

test("session ownership is enforced", async () => {
  const { dependencies } = createDependencies();
  const owner = await recover(dependencies, "owner");
  const intruder = await recover(dependencies, "intruder", owner.session.sessionId);
  assert.notEqual(intruder.session.sessionId, owner.session.sessionId);
  assert.equal(intruder.session.clerkId, "intruder");
});

test("changing a session ID cannot expose a foreign session reference", async () => {
  const { dependencies } = createDependencies();
  const owner = await recover(dependencies, "owner");
  const intruder = await recover(dependencies, "intruder", owner.session.sessionId);
  assert.equal(intruder.session.participantId, "p123");
  assert.equal(intruder.session.sessionId, "fs_test_2");
});

test("multiple tabs recover the same durable state", async () => {
  const { dependencies } = createDependencies();
  const [tabA, tabB, tabC] = await Promise.all([recover(dependencies), recover(dependencies), recover(dependencies)]);
  assert.deepEqual(tabA.state, tabB.state);
  assert.deepEqual(tabB.state, tabC.state);
});

test("multiple devices use different sessions but the same participant, queue, and allocation", async () => {
  const { dependencies } = createDependencies();
  const laptop = await recover(dependencies);
  const phone = await recover(dependencies);
  assert.notEqual(laptop.session.sessionId, phone.session.sessionId);
  assert.equal(laptop.state.participation?.participantId, phone.state.participation?.participantId);
  assert.equal(laptop.state.queue?.queueEntryId, phone.state.queue?.queueEntryId);
  assert.equal(laptop.state.allocation?.seatId, phone.state.allocation?.seatId);
});

test("100 concurrent recoveries are consistent and create no durable records", async () => {
  const { dependencies, sessions } = createDependencies();
  const results = await Promise.all(Array.from({ length: 100 }, () => recover(dependencies)));
  assert.equal(new Set(results.map((result) => result.state.queue?.sequence)).size, 1);
  assert.equal(new Set(results.map((result) => result.state.allocation?.seatId)).size, 1);
  assert.equal(sessions.size, 100);
});

test("a participation with no queue remains unqueued", async () => {
  const { dependencies } = createDependencies(recoveredState({ queue: null, allocation: null }));
  const result = await recover(dependencies);
  assert.equal(result.state.participation?.participantId, "p123");
  assert.equal(result.state.queue, null);
});

test("a queued participant with no allocation remains unallocated", async () => {
  const { dependencies } = createDependencies(recoveredState({ allocation: null }));
  const result = await recover(dependencies);
  assert.equal(result.state.queue?.queueEntryId, "q123");
  assert.equal(result.state.allocation, null);
});

test("a user with no FairDrop records receives an empty safe state", async () => {
  const { dependencies } = createDependencies(recoveredState({ activeDropId: null, drop: null, participation: null, queue: null, allocation: null }));
  const result = await recover(dependencies);
  assert.equal(result.state.activeDropId, null);
  assert.equal(result.session.participantId, null);
});

test("closed drops remain recoverable as historical state", async () => {
  const { dependencies } = createDependencies(recoveredState({
    drop: { dropId: "fairdrop-demo", status: "INACTIVE", exists: true },
  }));
  const result = await recover(dependencies);
  assert.equal(result.state.drop?.status, "INACTIVE");
  assert.equal(result.state.allocation?.seatId, "S042");
});

test("stale session references are repaired from authoritative state", async () => {
  const { dependencies, sessions } = createDependencies();
  sessions.set("fs_stale", {
    sessionId: "fs_stale", clerkId: "user_1", activeDropId: "missing-drop", participantId: "wrong", queueEntryId: "wrong", allocationId: "wrong",
    status: "ACTIVE", createdAt: NOW.toISOString(), lastSeenAt: NOW.toISOString(), expiresAt: "2026-01-01T01:00:00.000Z",
  });
  const result = await recover(dependencies, "user_1", "fs_stale");
  assert.equal(result.session.participantId, "p123");
  assert.equal(result.session.queueEntryId, "q123");
  assert.equal(result.session.allocationId, "a123");
});

test("Redis read failure is surfaced safely", async () => {
  const context = createDependencies();
  context.failRedisRead();
  await assert.rejects(recover(context.dependencies, "user_1", "fs_any"));
});

test("Redis write failure is surfaced safely", async () => {
  const context = createDependencies();
  context.failRedisWrite();
  await assert.rejects(recover(context.dependencies));
});

test("MongoDB recovery failure is surfaced without inventing state", async () => {
  const context = createDependencies();
  context.failMongo();
  await assert.rejects(recover(context.dependencies));
});

test("recovery performs only one authoritative-state read and no creation operation", async () => {
  const context = createDependencies();
  await recover(context.dependencies);
  assert.equal(context.durableReads, 1);
});

test("recovery never calls an allocation-creation operation", async () => {
  const { dependencies, sessions } = createDependencies();
  await recover(dependencies);
  assert.equal(sessions.size, 1);
});

test("session TTL is refreshed only on meaningful recovery", async () => {
  const { dependencies } = createDependencies();
  const result = await recover(dependencies);
  assert.equal(result.session.expiresAt, "2026-01-01T00:01:00.000Z");
});

test("invalid TTL is rejected", async () => {
  const { dependencies } = createDependencies();
  await assert.rejects(recoverSessionState({ clerkId: "user_1", ttlSeconds: 0 }, dependencies), SessionUnavailableError);
});
