import assert from "node:assert/strict";
import test from "node:test";

import {
  AllocationEngineError,
  claimAllocation,
  seatIdForSequence,
  type AllocationEngineDependencies,
  type AllocationState,
} from "../lib/allocation-engine.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function createDependencies(capacity = 500) {
  const participants = new Map<string, string>();
  const queues = new Map<string, { queueEntryId: string; sequence: number }>();
  const reservations = new Map<string, AllocationState>();
  const allocations = new Map<string, AllocationState>();
  const seats = new Map<string, string>();

  const dependencies: AllocationEngineDependencies = {
    getDrop: async (dropId) => ({
      dropId,
      capacity,
      status: "ACTIVE",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: null,
    }),
    getParticipant: async (dropId, clerkId) => {
      const participantId = participants.get(`${dropId}:${clerkId}`);
      return participantId ? { participantId } : null;
    },
    getQueueEntry: async (dropId, participantId) => {
      const queue = queues.get(`${dropId}:${participantId}`);
      return queue ? { dropId, participantId, ...queue, status: "WAITING" } : null;
    },
    getExistingAllocation: async (dropId, participantId) => allocations.get(`${dropId}:${participantId}`) ?? null,
    reserveAllocation: async (allocation, allowedCapacity) => {
      const key = `${allocation.dropId}:${allocation.participantId}`;
      const existing = reservations.get(key);
      if (existing) return { kind: "EXISTING" as const, allocation: existing };
      if (allocation.queueSequence > allowedCapacity) return { kind: "NOT_ELIGIBLE" as const };
      if (seats.has(`${allocation.dropId}:${allocation.seatId}`)) return { kind: "CONFLICT" as const };
      reservations.set(key, allocation);
      seats.set(`${allocation.dropId}:${allocation.seatId}`, allocation.participantId);
      return { kind: "RESERVED" as const, allocation };
    },
    persistAllocation: async (allocation) => {
      const key = `${allocation.dropId}:${allocation.participantId}`;
      const existing = allocations.get(key);
      if (existing) return { allocation: existing, created: false };
      allocations.set(key, allocation);
      return { allocation, created: true };
    },
    now: () => NOW,
  };

  function addUser(clerkId: string, sequence: number) {
    const participantId = `p_${clerkId}`;
    participants.set(`fairdrop-demo:${clerkId}`, participantId);
    queues.set(`fairdrop-demo:${participantId}`, { queueEntryId: `q_${clerkId}`, sequence });
  }

  return { dependencies, addUser, reservations, allocations, seats };
}

test("seat IDs are deterministic and preserve queue sequence", () => {
  assert.equal(seatIdForSequence("fairdrop-demo", 1, 500), "fairdrop-demo-seat-001");
  assert.equal(seatIdForSequence("fairdrop-demo", 500, 500), "fairdrop-demo-seat-500");
});

test("one eligible participant receives one durable, repeatable allocation", async () => {
  const { dependencies, addUser, allocations } = createDependencies();
  addUser("one", 42);

  const first = await claimAllocation("fairdrop-demo", "one", dependencies);
  const repeated = await claimAllocation("fairdrop-demo", "one", dependencies);

  assert.equal(first.created, true);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.allocation, first.allocation);
  assert.equal(first.allocation.seatId, "fairdrop-demo-seat-042");
  assert.equal(allocations.size, 1);
});

test("participants must exist and have a queue entry", async () => {
  const { dependencies, addUser } = createDependencies();
  await assert.rejects(claimAllocation("fairdrop-demo", "missing", dependencies), (error) =>
    error instanceof AllocationEngineError && error.code === "NOT_A_PARTICIPANT"
  );
  addUser("queued-removed", 1);
  dependencies.getQueueEntry = async () => null;
  await assert.rejects(claimAllocation("fairdrop-demo", "queued-removed", dependencies), (error) =>
    error instanceof AllocationEngineError && error.code === "NOT_QUEUED"
  );
});

test("sequence above capacity is never eligible even if that participant claims first", async () => {
  const { dependencies, addUser, allocations } = createDependencies(500);
  addUser("late", 501);

  await assert.rejects(claimAllocation("fairdrop-demo", "late", dependencies), (error) =>
    error instanceof AllocationEngineError && error.code === "NOT_ELIGIBLE"
  );
  assert.equal(allocations.size, 0);
});

test("500 eligible concurrent participants receive exactly 500 unique deterministic seats", async () => {
  const { dependencies, addUser, allocations, seats } = createDependencies(500);
  for (let index = 1; index <= 500; index += 1) addUser(`eligible-${index}`, index);

  const results = await Promise.all(
    Array.from({ length: 500 }, (_, index) => claimAllocation("fairdrop-demo", `eligible-${index + 1}`, dependencies))
  );

  assert.equal(allocations.size, 500);
  assert.equal(seats.size, 500);
  assert.equal(new Set(results.map((result) => result.allocation.seatId)).size, 500);
  assert.equal(Math.max(...results.map((result) => result.allocation.queueSequence)), 500);
});

test("1,000 concurrent participants cannot allocate more than the 500-seat cohort", async () => {
  const { dependencies, addUser, allocations, seats } = createDependencies(500);
  for (let index = 1; index <= 1_000; index += 1) addUser(`many-${index}`, index);

  const outcomes = await Promise.allSettled(
    Array.from({ length: 1_000 }, (_, index) => claimAllocation("fairdrop-demo", `many-${index + 1}`, dependencies))
  );

  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 500);
  assert.equal(allocations.size, 500);
  assert.equal(seats.size, 500);
});

test("10,000 concurrent repeated claims stay idempotent and do not oversell", async () => {
  const { dependencies, addUser, allocations, reservations, seats } = createDependencies(500);
  for (let index = 1; index <= 1_000; index += 1) addUser(`burst-${index}`, index);

  const outcomes = await Promise.allSettled(
    Array.from({ length: 10_000 }, (_, index) => {
      const participant = (index % 1_000) + 1;
      return claimAllocation("fairdrop-demo", `burst-${participant}`, dependencies);
    })
  );

  const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
  assert.equal(fulfilled.length, 5_000);
  assert.equal(allocations.size, 500);
  assert.equal(reservations.size, 500);
  assert.equal(seats.size, 500);
  assert.equal(new Set(fulfilled.map((outcome) => (outcome as PromiseFulfilledResult<{ allocation: AllocationState }>).value.allocation.seatId)).size, 500);
});

test("a Mongo persistence failure retains the exact Redis reservation for retry", async () => {
  const { dependencies, addUser, reservations, allocations } = createDependencies();
  addUser("retry", 7);
  const persist = dependencies.persistAllocation;
  let failOnce = true;
  dependencies.persistAllocation = async (allocation) => {
    if (failOnce) {
      failOnce = false;
      throw new Error("MongoDB unavailable");
    }
    return persist(allocation);
  };

  await assert.rejects(claimAllocation("fairdrop-demo", "retry", dependencies));
  const retried = await claimAllocation("fairdrop-demo", "retry", dependencies);

  assert.equal(reservations.size, 1);
  assert.equal(allocations.size, 1);
  assert.equal(retried.allocation.seatId, "fairdrop-demo-seat-007");
});

test("invalid drop timing and malformed queue sequence do not create allocations", async () => {
  const { dependencies, addUser, allocations } = createDependencies();
  addUser("invalid", 1);
  dependencies.getDrop = async () => ({
    dropId: "fairdrop-demo", capacity: 500, status: "INACTIVE", startsAt: NOW, endsAt: null,
  });
  await assert.rejects(claimAllocation("fairdrop-demo", "invalid", dependencies), (error) =>
    error instanceof AllocationEngineError && error.code === "DROP_NOT_ACTIVE"
  );
  assert.equal(allocations.size, 0);
});

test("a durable allocation remains idempotent after the drop later closes", async () => {
  const { dependencies, addUser } = createDependencies();
  addUser("closed-retry", 1);
  const first = await claimAllocation("fairdrop-demo", "closed-retry", dependencies);
  dependencies.getDrop = async () => ({
    dropId: "fairdrop-demo", capacity: 500, status: "INACTIVE", startsAt: NOW, endsAt: NOW,
  });

  const retried = await claimAllocation("fairdrop-demo", "closed-retry", dependencies);
  assert.equal(retried.created, false);
  assert.deepEqual(retried.allocation, first.allocation);
});
