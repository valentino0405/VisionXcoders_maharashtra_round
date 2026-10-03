import assert from "node:assert/strict";
import test from "node:test";

import {
  FairnessInputError,
  calculateAllocationMetrics,
  createFairnessSnapshot,
  type BehaviorGroup,
  type FairnessObservation,
} from "../lib/fairness-engine.ts";

function observation(
  subjectId: string,
  behaviorGroup: BehaviorGroup = "NORMAL",
  overrides: Partial<FairnessObservation> = {}
): FairnessObservation {
  return {
    subjectId,
    behaviorGroup,
    joinAttempts: 1,
    participationSucceeded: true,
    queueAttempts: 1,
    queueEntered: true,
    queue: { entryId: `queue-${subjectId}`, position: 1, sequence: 1, totalQueueSize: 1 },
    ...overrides,
  };
}

function snapshot(observations: FairnessObservation[]) {
  return createFairnessSnapshot({
    experimentId: "fairness-test",
    dropId: "fairdrop-demo",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T01:00:00.000Z",
    observations,
  });
}

test("empty population returns explicit unavailable rates and allocation metrics", () => {
  const result = snapshot([]);

  assert.equal(result.population.totalUsers, 0);
  assert.equal(result.metrics.participationRate.availability, "UNAVAILABLE");
  assert.equal(result.metrics.queuePositionDistribution.mean, null);
  assert.equal(result.allocationMetrics.status, "NOT_AVAILABLE_UNTIL_PHASE_6");
  assert.equal(result.allocationMetrics.allocationRate, null);
});

test("one user is measured but marked low reliability", () => {
  const result = snapshot([observation("one")]);

  assert.equal(result.metrics.participationRate.value, 1);
  assert.equal(result.metrics.participationRate.sampleSize, 1);
  assert.equal(result.metrics.participationRate.reliability, "LOW");
  assert.ok(result.metrics.participationRate.confidenceInterval95);
});

test("a small sample between 10 and 29 is marked limited reliability", () => {
  const result = snapshot(Array.from({ length: 10 }, (_, index) => observation(`limited-${index}`)));

  assert.equal(result.metrics.participationRate.reliability, "LIMITED");
});

test("a normal-only population with all users queued has full queue access", () => {
  const result = snapshot(Array.from({ length: 30 }, (_, index) => observation(`normal-only-${index}`, "NORMAL", {
    queue: { entryId: `normal-only-entry-${index}`, position: index + 1, sequence: index + 1, totalQueueSize: 30 },
  })));

  assert.equal(result.groups.NORMAL.queueAccessRate.value, 1);
  assert.equal(result.groups.NORMAL.queueAccessRate.reliability, "STANDARD");
});

test("mixed behavioral groups calculate known population and rate values", () => {
  const observations: FairnessObservation[] = [];
  let position = 1;
  for (let index = 0; index < 100; index += 1) {
    observations.push(observation(`normal-${index}`, "NORMAL", {
      queue: { entryId: `normal-${index}`, position: position++, sequence: index + 1, totalQueueSize: 137 },
    }));
  }
  for (let index = 0; index < 20; index += 1) {
    const queued = index < 15;
    observations.push(observation(`low-${index}`, "LOW_RISK", queued ? {
      queue: { entryId: `low-${index}`, position: position++, sequence: position, totalQueueSize: 137 },
    } : { queueEntered: false, queue: undefined }));
  }
  for (let index = 0; index < 10; index += 1) {
    const queued = index < 5;
    observations.push(observation(`suspicious-${index}`, "SUSPICIOUS", queued ? {
      queue: { entryId: `suspicious-${index}`, position: position++, sequence: position, totalQueueSize: 137 },
    } : { queueEntered: false, queue: undefined }));
  }
  for (let index = 0; index < 5; index += 1) {
    observations.push(observation(`throttled-${index}`, "THROTTLED", {
      queueEntered: false, queue: undefined, enforcement: { throttled: true },
    }));
  }
  for (let index = 0; index < 2; index += 1) {
    observations.push(observation(`blocked-${index}`, "BLOCKED", {
      participationSucceeded: false, queueAttempts: 0, queueEntered: false, queue: undefined,
      enforcement: { blocked: true },
    }));
  }

  const result = snapshot(observations);

  assert.deepEqual(result.population, { totalUsers: 137, participants: 135, queued: 120 });
  assert.equal(result.metrics.participationRate.value, 135 / 137);
  assert.equal(result.metrics.queueEntryRate.value, 120 / 135);
  assert.equal(result.groups.NORMAL.queueAccessRate.value, 1);
  assert.equal(result.groups.LOW_RISK.queueAccessRate.value, 0.75);
  assert.equal(result.groups.SUSPICIOUS.queueAccessRate.value, 0.5);
  assert.equal(result.groups.THROTTLED.throttleRate.value, 1);
  assert.equal(result.groups.BLOCKED.blockRate.value, 1);
  assert.equal(result.metrics.groupComparisons.find((metric) => metric.comparisonGroup === "SUSPICIOUS" && metric.metric === "QUEUE_ENTRY_RATE")?.rateRatio, 0.5);
});

test("distribution uses linear-interpolated percentiles and normalized positions", () => {
  const entries = [1, 2, 3, 4, 5].map((position) => observation(`position-${position}`, "NORMAL", {
    queue: { entryId: `entry-${position}`, position, sequence: position, totalQueueSize: 10 },
  }));
  const result = snapshot(entries);

  assert.equal(result.metrics.queuePositionDistribution.mean, 3);
  assert.equal(result.metrics.queuePositionDistribution.median, 3);
  assert.equal(result.metrics.queuePositionDistribution.p90, 4.6);
  assert.equal(result.metrics.queuePositionDistribution.p95, 4.8);
  assert.equal(result.metrics.queuePositionDistribution.p99, 4.96);
  assert.equal(result.metrics.normalizedQueuePositionDistribution.median, 0.3);
});

test("a participant population with no queued users has unavailable position distributions", () => {
  const result = snapshot([
    observation("no-queue-a", "NORMAL", { queueEntered: false, queue: undefined }),
    observation("no-queue-b", "LOW_RISK", { queueEntered: false, queue: undefined }),
  ]);

  assert.equal(result.metrics.queueEntryRate.value, 0);
  assert.equal(result.metrics.queuePositionDistribution.availability, "UNAVAILABLE");
  assert.equal(result.metrics.normalizedQueuePositionDistribution.p99, null);
});

test("normalized positions compare correctly across different queue sizes", () => {
  const result = snapshot([
    observation("normal-relative", "NORMAL", {
      queue: { entryId: "normal-relative-entry", position: 10, sequence: 10, totalQueueSize: 100 },
    }),
    observation("suspicious-relative", "SUSPICIOUS", {
      queue: { entryId: "suspicious-relative-entry", position: 20, sequence: 20, totalQueueSize: 100 },
    }),
  ]);
  const comparison = result.metrics.groupComparisons.find(
    (metric) => metric.comparisonGroup === "SUSPICIOUS" && metric.metric === "MEDIAN_NORMALIZED_QUEUE_POSITION"
  );

  assert.equal(comparison?.difference, 0.1);
  assert.equal(comparison?.rateRatio, 2);
});

test("duplicate and invalid-token metrics use attempt denominators and preserve breakdowns", () => {
  const result = snapshot([
    observation("attempts-a", "NORMAL", {
      joinAttempts: 3, queueAttempts: 2, duplicateAttempts: 3, tokenValidationAttempts: 4,
      invalidTokenAttempts: { malformed: 1, expired: 1, signatureFailure: 1 },
    }),
    observation("attempts-b", "LOW_RISK", {
      joinAttempts: 1, queueAttempts: 1, tokenValidationAttempts: 2,
      invalidTokenAttempts: { ownershipMismatch: 1, dropMismatch: 1 },
    }),
  ]);

  assert.equal(result.metrics.duplicateAttemptRate.value, 3 / 7);
  assert.equal(result.metrics.invalidTokenRate.value, 5 / 6);
  assert.deepEqual(result.metrics.invalidTokenRate.breakdown, {
    malformed: 1, expired: 1, signatureFailure: 1, ownershipMismatch: 1, dropMismatch: 1,
  });
});

test("retry resilience detects immutable retries and attempted position improvements", () => {
  const result = snapshot([
    observation("stable", "NORMAL", {
      retry: {
        first: { entryId: "entry-a", position: 9, sequence: 9, totalQueueSize: 20 },
        repeated: [
          { entryId: "entry-a", position: 9, sequence: 9, totalQueueSize: 20 },
          { entryId: "entry-a", position: 9, sequence: 9, totalQueueSize: 20 },
        ],
      },
    }),
    observation("improved", "SUSPICIOUS", {
      retry: {
        first: { entryId: "entry-b", position: 10, sequence: 10, totalQueueSize: 20 },
        repeated: [{ entryId: "entry-c", position: 8, sequence: 8, totalQueueSize: 20 }],
      },
    }),
  ]);

  assert.equal(result.metrics.retryResilience.sampleSize, 3);
  assert.equal(result.metrics.retryResilience.unchangedIdentityRate.value, 2 / 3);
  assert.equal(result.metrics.retryResilience.improvedPositionCount, 1);
  assert.equal(result.metrics.retryResilience.improvedSequenceCount, 1);
});

test("retry resilience is unavailable when no repeated valid queue request was observed", () => {
  const result = snapshot([observation("no-retry")]);

  assert.equal(result.metrics.retryResilience.availability, "UNAVAILABLE");
  assert.equal(result.metrics.retryResilience.unchangedIdentityRate.value, null);
});

test("throttle and block impact remain descriptive with comparable intervals", () => {
  const result = snapshot([
    observation("impact-a", "THROTTLED", {
      enforcement: { throttled: true, requestRateBeforeThrottle: 12, requestRateDuringThrottle: 3 },
    }),
    observation("impact-b", "BLOCKED", {
      enforcement: { blocked: true, requestsBeforeBlock: 10, requestsDuringBlock: 1, requestsAfterBlockExpiration: 4 },
    }),
  ]);

  assert.equal(result.metrics.throttlingImpact.observedChangeDuring, -9);
  assert.equal(result.metrics.blockImpact.beforeMean, 10);
  assert.equal(result.metrics.blockImpact.duringMean, 1);
  assert.equal(result.metrics.blockImpact.afterMean, 4);
});

test("throttle and block rates distinguish enforcement exposure from group labels", () => {
  const result = snapshot([
    observation("normal-throttled", "NORMAL", { enforcement: { throttled: true } }),
    observation("suspicious-unthrottled", "SUSPICIOUS"),
    observation("blocked", "BLOCKED", { enforcement: { blocked: true } }),
  ]);

  assert.equal(result.metrics.throttleRate.value, 1 / 3);
  assert.equal(result.metrics.blockRate.value, 1 / 3);
  assert.equal(result.groups.NORMAL.throttleRate.value, 1);
  assert.equal(result.groups.SUSPICIOUS.throttleRate.value, 0);
});

test("zero denominators and missing queue data never yield NaN or Infinity", () => {
  const result = snapshot([
    observation("not-participant", "BLOCKED", {
      participationSucceeded: false, queueAttempts: 0, queueEntered: false, queue: undefined,
    }),
  ]);

  assert.equal(result.metrics.queueEntryRate.availability, "UNAVAILABLE");
  assert.equal(result.groups.BLOCKED.queueAccessRate.value, null);
  assert.equal(result.metrics.invalidTokenRate.value, null);
  assert.equal(result.metrics.queuePositionDistribution.availability, "UNAVAILABLE");
});

test("invalid mathematical inputs are rejected before producing a snapshot", () => {
  assert.throws(() => snapshot([observation("negative", "NORMAL", { joinAttempts: -1 })]), FairnessInputError);
  assert.throws(() => snapshot([observation("impossible-position", "NORMAL", {
    queue: { entryId: "bad", position: 5, sequence: 1, totalQueueSize: 4 },
  })]), FairnessInputError);
  assert.throws(() => createFairnessSnapshot({
    experimentId: "x", dropId: "d", startedAt: "invalid", endedAt: "2026-01-01", observations: [],
  }), FairnessInputError);
});

test("future allocation interface is unavailable without Phase 6 inputs and computes only provided outcomes", () => {
  assert.equal(calculateAllocationMetrics().status, "NOT_AVAILABLE_UNTIL_PHASE_6");
  const metrics = calculateAllocationMetrics([
    { participantId: "a", behaviorGroup: "NORMAL", eligible: true, allocated: true, seatId: "seat-1" },
    { participantId: "b", behaviorGroup: "SUSPICIOUS", eligible: true, allocated: false },
    { participantId: "c", behaviorGroup: "NORMAL", eligible: true, allocated: true, seatId: "seat-1" },
  ], 2, "Phase 6 test window");

  assert.equal(metrics.status, "AVAILABLE");
  assert.equal(metrics.allocationRate?.value, 2 / 3);
  assert.equal(metrics.duplicateAllocationRate?.value, 1 / 2);
  assert.equal(metrics.oversellRate?.value, 0);
});

test("allocation oversell calculation requires an explicit capacity", () => {
  const outcomes = [
    { participantId: "a", behaviorGroup: "NORMAL" as const, eligible: true, allocated: true, seatId: "seat-1" },
    { participantId: "b", behaviorGroup: "LOW_RISK" as const, eligible: true, allocated: true, seatId: "seat-2" },
  ];

  assert.equal(calculateAllocationMetrics(outcomes).oversellRate, null);
  assert.equal(calculateAllocationMetrics(outcomes, 1).oversellRate?.value, 1);
});

test("duplicate subject records are rejected so population denominators remain unique", () => {
  assert.throws(() => snapshot([observation("same"), observation("same", "LOW_RISK")]), FairnessInputError);
});

test("allocation capacity rejects invalid values rather than returning invalid arithmetic", () => {
  assert.throws(() => calculateAllocationMetrics([], -1), FairnessInputError);
});

test("large deterministic populations remain linear and consistent", () => {
  const observations = Array.from({ length: 50_000 }, (_, index) => observation(`large-${index}`, index % 10 === 0 ? "LOW_RISK" : "NORMAL", {
    queue: { entryId: `large-entry-${index}`, position: index + 1, sequence: index + 1, totalQueueSize: 50_000 },
  }));
  const first = snapshot(observations);
  const second = snapshot(observations);

  assert.equal(first.population.totalUsers, 50_000);
  assert.equal(first.metrics.queueEntryRate.value, 1);
  assert.deepEqual(first.metrics.queuePositionDistribution, second.metrics.queuePositionDistribution);
});
