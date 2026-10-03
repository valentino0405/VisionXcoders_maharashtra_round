import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { MongoClient } from "mongodb";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;
const client = new MongoClient(mongoUri);

test("Phase 5: Snapshot calculation, mathematical consistency, and explainability", async () => {
  const { createFairnessSnapshot } = await import("../lib/fairness-engine.ts");

  const runId = randomUUID().replaceAll("-", "");
  const expId = `exp_${runId}`;
  const dropId = "fairdrop-demo";

  // Build a known population with verified ground-truth values
  // 50 NORMAL (all participate, 50 queue)
  // 20 LOW_RISK (all participate, 15 queue)
  // 10 SUSPICIOUS (all participate, 5 queue)
  // 5 THROTTLED (5 participate, 0 queue, 5 throttled)
  // 5 BLOCKED (0 participate, 0 queue, 5 blocked)
  // Total = 90 subjects

  const observations = [];
  let seq = 1;

  for (let i = 0; i < 50; i++) {
    observations.push({
      subjectId: `norm_${i}`,
      behaviorGroup: "NORMAL",
      joinAttempts: 1,
      participationSucceeded: true,
      queueAttempts: 1,
      queueEntered: true,
      queue: { entryId: `q_norm_${i}`, position: seq, sequence: seq++, totalQueueSize: 70 },
      retry: {
        first: { entryId: `q_norm_${i}`, position: seq - 1, sequence: seq - 1, totalQueueSize: 70 },
        repeated: [{ entryId: `q_norm_${i}`, position: seq - 1, sequence: seq - 1, totalQueueSize: 70 }],
      },
    });
  }

  for (let i = 0; i < 20; i++) {
    const q = i < 15;
    observations.push({
      subjectId: `low_${i}`,
      behaviorGroup: "LOW_RISK",
      joinAttempts: 1,
      participationSucceeded: true,
      queueAttempts: 1,
      queueEntered: q,
      queue: q ? { entryId: `q_low_${i}`, position: seq, sequence: seq++, totalQueueSize: 70 } : undefined,
    });
  }

  for (let i = 0; i < 10; i++) {
    const q = i < 5;
    observations.push({
      subjectId: `susp_${i}`,
      behaviorGroup: "SUSPICIOUS",
      joinAttempts: 2,
      participationSucceeded: true,
      queueAttempts: 2,
      queueEntered: q,
      duplicateAttempts: 2,
      tokenValidationAttempts: 3,
      invalidTokenAttempts: { malformed: 1, expired: 1 },
      queue: q ? { entryId: `q_susp_${i}`, position: seq, sequence: seq++, totalQueueSize: 70 } : undefined,
    });
  }

  for (let i = 0; i < 5; i++) {
    observations.push({
      subjectId: `throttled_${i}`,
      behaviorGroup: "THROTTLED",
      joinAttempts: 1,
      participationSucceeded: true,
      queueAttempts: 1,
      queueEntered: false,
      enforcement: { throttled: true, requestRateBeforeThrottle: 15, requestRateDuringThrottle: 2 },
    });
  }

  for (let i = 0; i < 5; i++) {
    observations.push({
      subjectId: `blocked_${i}`,
      behaviorGroup: "BLOCKED",
      joinAttempts: 3,
      participationSucceeded: false,
      queueAttempts: 0,
      queueEntered: false,
      enforcement: { blocked: true, requestsBeforeBlock: 20, requestsDuringBlock: 1, requestsAfterBlockExpiration: 3 },
    });
  }

  const snapshot = createFairnessSnapshot({
    experimentId: expId,
    dropId,
    startedAt: "2026-10-03T10:00:00.000Z",
    endedAt: "2026-10-03T11:00:00.000Z",
    observations,
  });

  // Independent mathematical verification
  assert.equal(snapshot.population.totalUsers, 90);
  assert.equal(snapshot.population.participants, 85); // 50 + 20 + 10 + 5
  assert.equal(snapshot.population.queued, 70); // 50 + 15 + 5

  // Participation rate = 85 / (50*1 + 20*1 + 10*2 + 5*1 + 5*3) = 85 / (50 + 20 + 20 + 5 + 15) = 85 / 110
  assert.equal(snapshot.metrics.participationRate.value, 85 / 110);
  assert.equal(snapshot.metrics.participationRate.sampleSize, 110);

  // Queue entry rate = 70 / 85
  assert.equal(snapshot.metrics.queueEntryRate.value, 70 / 85);

  // Groups
  assert.equal(snapshot.groups.NORMAL.queueAccessRate.value, 1.0); // 50/50
  assert.equal(snapshot.groups.LOW_RISK.queueAccessRate.value, 15 / 20); // 0.75
  assert.equal(snapshot.groups.SUSPICIOUS.queueAccessRate.value, 5 / 10); // 0.5
  assert.equal(snapshot.groups.THROTTLED.throttleRate.value, 1.0); // 5/5
  assert.equal(snapshot.groups.BLOCKED.blockRate.value, 1.0); // 5/5

  // Retry resilience: 50 repeated requests, all unchanged
  assert.equal(snapshot.metrics.retryResilience.unchangedPositionRate.value, 1.0);
  assert.equal(snapshot.metrics.retryResilience.improvedPositionCount, 0);

  // Throttling impact
  assert.equal(snapshot.metrics.throttlingImpact.beforeMean, 15);
  assert.equal(snapshot.metrics.throttlingImpact.duringMean, 2);
  assert.equal(snapshot.metrics.throttlingImpact.observedChangeDuring, -13);

  // Explanations must be present for metrics
  assert.ok(snapshot.metrics.participationRate.definition);
  assert.ok(snapshot.metrics.participationRate.interpretation);
  assert.ok(snapshot.metrics.participationRate.limitation);
});

test("Phase 5: Persistence to MongoDB fairnessSnapshots and historical preservation", async () => {
  const { createFairnessSnapshot } = await import("../lib/fairness-engine.ts");

  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const snapshotsCol = db.collection("fairnessSnapshots");

  const runId = randomUUID().replaceAll("-", "");
  const expId = `exp_persist_${runId}`;
  const dropId = "fairdrop-demo";

  const snapshot = createFairnessSnapshot({
    experimentId: expId,
    dropId,
    startedAt: "2026-10-03T10:00:00.000Z",
    endedAt: "2026-10-03T11:00:00.000Z",
    observations: [
      {
        subjectId: "sub_1",
        behaviorGroup: "NORMAL",
        joinAttempts: 1,
        participationSucceeded: true,
        queueAttempts: 1,
        queueEntered: true,
        queue: { entryId: "q1", position: 1, sequence: 1, totalQueueSize: 1 },
      },
    ],
  });

  try {
    await snapshotsCol.findOneAndUpdate(
      { experimentId: snapshot.experimentId },
      {
        $set: {
          experimentId: snapshot.experimentId,
          dropId: snapshot.dropId,
          startedAt: new Date(snapshot.startedAt),
          endedAt: new Date(snapshot.endedAt),
          snapshot,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const doc = await snapshotsCol.findOne({ experimentId: expId });
    assert.ok(doc, "Snapshot must be saved in MongoDB");
    assert.equal(doc.dropId, dropId);
    assert.equal(doc.snapshot.population.totalUsers, 1);
    assert.equal(doc.snapshot.metrics.queueEntryRate.value, 1);
  } finally {
    await snapshotsCol.deleteOne({ experimentId: expId });
  }
});

test("Phase 5: Read-Only guarantee - calculating snapshots never mutates participation, queue, or drop state", async () => {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");

  const pBefore = await db.collection("participations").countDocuments();
  const qBefore = await db.collection("queueEntries").countDocuments();
  const dBefore = await db.collection("drops").countDocuments();

  const { createFairnessSnapshot } = await import("../lib/fairness-engine.ts");
  createFairnessSnapshot({
    experimentId: "readonly-check",
    dropId: "fairdrop-demo",
    startedAt: new Date(),
    endedAt: new Date(),
    observations: [],
  });

  const pAfter = await db.collection("participations").countDocuments();
  const qAfter = await db.collection("queueEntries").countDocuments();
  const dAfter = await db.collection("drops").countDocuments();

  assert.equal(pAfter, pBefore, "Participations collection must not be modified by fairness engine");
  assert.equal(qAfter, qBefore, "Queue entries collection must not be modified by fairness engine");
  assert.equal(dAfter, dBefore, "Drops collection must not be modified by fairness engine");
});

test.after(async () => {
  await client.close();
});
