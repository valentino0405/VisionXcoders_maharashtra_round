import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { MongoClient } from "mongodb";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const tokenSecret = process.env.QUEUE_TOKEN_SECRET || "fairdrop-super-secret-queue-token-key-32-chars-long";

const client = new MongoClient(mongoUri);
const redis = new Redis({ url: redisUrl, token: redisToken });

test("Scenario A: Normal User End-to-End Workflow", async () => {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = db.collection("participations");
  const queueEntries = db.collection("queueEntries");

  const runId = randomUUID().replaceAll("-", "");
  const clerkId = `alice_${runId}`;
  const dropId = "fairdrop-demo";
  const participantId = `p_alice_${runId}`;
  const queueEntryId = `q_alice_${runId}`;

  const { issueQueueToken, verifyQueueTokenDetailed } = await import("../lib/queue-token.ts");

  try {
    // 1. Join Active Drop
    const joinResult = await participations.findOneAndUpdate(
      { dropId, clerkId },
      {
        $setOnInsert: {
          participantId,
          dropId,
          clerkId,
          status: "JOINED",
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    assert.ok(joinResult);
    assert.equal(joinResult.status, "JOINED");
    assert.equal(joinResult.participantId, participantId);

    // 2. Enter Queue
    const sequence = 1001;
    const queueResult = await queueEntries.findOneAndUpdate(
      { dropId, participantId },
      {
        $setOnInsert: {
          queueEntryId,
          dropId,
          participantId,
          clerkId,
          sequence,
          status: "WAITING",
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    assert.ok(queueResult);
    assert.equal(queueResult.sequence, 1001);

    // 3. Receive signed token
    const token = issueQueueToken({ dropId, participantId, queueEntryId }, tokenSecret);
    assert.ok(token);

    // 4. Check Queue Status with token
    const verifyRes = verifyQueueTokenDetailed(token, { dropId, participantId, queueEntryId }, tokenSecret);
    assert.equal(verifyRes.valid, true);

    // 5. Retry Drop Join (Idempotency)
    const retryJoin = await participations.findOneAndUpdate(
      { dropId, clerkId },
      {
        $setOnInsert: {
          participantId: `should_not_be_used_${runId}`,
          dropId,
          clerkId,
          status: "JOINED",
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    assert.equal(retryJoin.participantId, participantId, "Retried join must return original participantId");

    // 6. Retry Queue Join (Idempotency)
    const retryQueue = await queueEntries.findOneAndUpdate(
      { dropId, participantId },
      {
        $setOnInsert: {
          queueEntryId: `should_not_be_used_${runId}`,
          dropId,
          participantId,
          clerkId,
          sequence: 9999,
          status: "WAITING",
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    assert.equal(retryQueue.sequence, 1001, "Queue sequence must remain stable on retry");
    assert.equal(retryQueue.queueEntryId, queueEntryId, "Queue entry ID must remain stable on retry");
  } finally {
    await participations.deleteOne({ dropId, clerkId });
    await queueEntries.deleteOne({ dropId, participantId });
  }
});

test("Scenario B: Multiple Legitimate Users Concurrently Joining", async () => {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = db.collection("participations");
  const queueEntries = db.collection("queueEntries");

  const runId = randomUUID().replaceAll("-", "");
  const userCount = 50;
  const dropId = "fairdrop-demo";
  const userList = Array.from({ length: userCount }, (_, i) => ({
    clerkId: `legit_${runId}_${i}`,
    participantId: `p_legit_${runId}_${i}`,
    queueEntryId: `q_legit_${runId}_${i}`,
  }));

  try {
    // Concurrent drop joins
    await Promise.all(
      userList.map((u) =>
        participations.findOneAndUpdate(
          { dropId, clerkId: u.clerkId },
          {
            $setOnInsert: {
              participantId: u.participantId,
              dropId,
              clerkId: u.clerkId,
              status: "JOINED",
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: "after" }
        )
      )
    );

    const partCount = await participations.countDocuments({ dropId, clerkId: { $in: userList.map((u) => u.clerkId) } });
    assert.equal(partCount, userCount, "All 50 users must have unique participation records");

    // Concurrent queue entries
    const queueResults = await Promise.all(
      userList.map((u, index) =>
        queueEntries.findOneAndUpdate(
          { dropId, participantId: u.participantId },
          {
            $setOnInsert: {
              queueEntryId: u.queueEntryId,
              dropId,
              participantId: u.participantId,
              clerkId: u.clerkId,
              sequence: index + 1,
              status: "WAITING",
              joinedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: "after" }
        )
      )
    );

    const qCount = await queueEntries.countDocuments({ dropId, participantId: { $in: userList.map((u) => u.participantId) } });
    assert.equal(qCount, userCount, "All 50 users must have unique queue entries");

    const sequences = queueResults.map((q) => q.sequence);
    assert.equal(new Set(sequences).size, userCount, "All sequence numbers must be distinct");
  } finally {
    await participations.deleteMany({ dropId, clerkId: { $in: userList.map((u) => u.clerkId) } });
    await queueEntries.deleteMany({ dropId, participantId: { $in: userList.map((u) => u.participantId) } });
  }
});

test("Scenario C: Abusive User Throttling and Blocking", async () => {
  const { evaluateAbuseRequest } = await import("../lib/abuse-engine.ts");
  const runId = randomUUID().replaceAll("-", "");
  const env = `test-${runId}`;
  process.env.FAIRDROP_ENV = env;
  const botId = `bot_${runId}`;
  const dropId = "fairdrop-demo";

  try {
    const decisions = [];
    // Send 30 rapid requests (limit is 20 in 10s)
    for (let i = 0; i < 30; i++) {
      const dec = await evaluateAbuseRequest({ clerkId: botId, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
      decisions.push(dec);
    }

    const throttled = decisions.filter((d) => d.classification === "THROTTLED");
    assert.ok(throttled.length > 0, "Abuser must be throttled");
    assert.equal(throttled[0].allowed, false);
    assert.ok(throttled[0].retryAfterSeconds > 0);

    // Continue sending while throttled -> triggers block
    const postThrottled = [];
    for (let i = 0; i < 6; i++) {
      const dec = await evaluateAbuseRequest({ clerkId: botId, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
      postThrottled.push(dec);
    }
    const blocked = postThrottled.filter((d) => d.classification === "BLOCKED");
    assert.ok(blocked.length > 0, "Abuser continuing to send while throttled must be BLOCKED");
  } finally {
    const keys = await redis.keys(`fairdrop:${env}:*`);
    if (keys.length > 0) await redis.del(...keys);
  }
});

test("Scenario D: Legitimate User and Attacker Concurrent Isolation", async () => {
  const { evaluateAbuseRequest } = await import("../lib/abuse-engine.ts");
  const runId = randomUUID().replaceAll("-", "");
  const env = `test-${runId}`;
  process.env.FAIRDROP_ENV = env;

  const attackerId = `attacker_${runId}`;
  const legitimateId = `good_user_${runId}`;
  const dropId = "fairdrop-demo";

  try {
    // Interleave attacker and legitimate requests
    const tasks = [];
    for (let i = 0; i < 25; i++) {
      tasks.push(evaluateAbuseRequest({ clerkId: attackerId, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis));
    }
    // Legitimate user makes 3 normal requests
    for (let i = 0; i < 3; i++) {
      tasks.push(evaluateAbuseRequest({ clerkId: legitimateId, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis));
    }

    const results = await Promise.all(tasks);

    // Attacker must have experienced throttle
    const attackerDecisions = results.slice(0, 25);
    const legitimateDecisions = results.slice(25);

    assert.ok(attackerDecisions.some((d) => d.classification === "THROTTLED" || d.classification === "BLOCKED"));
    assert.ok(legitimateDecisions.every((d) => d.classification === "NORMAL" && d.allowed === true));
  } finally {
    const keys = await redis.keys(`fairdrop:${env}:*`);
    if (keys.length > 0) await redis.del(...keys);
  }
});

test("Scenario E: Infrastructure Failure Resilience (Fail-Open for Abuse, Safe Persistence)", async () => {
  const { evaluateAbuseRequest } = await import("../lib/abuse-engine.ts");

  const failingRedis = {
    eval: async () => {
      throw new Error("Connection refused (Redis simulated down)");
    },
  };

  const decision = await evaluateAbuseRequest(
    { clerkId: "user_test", action: "QUEUE_STATUS", endpoint: "/api/queue/status" },
    failingRedis
  );

  // Documented failure behavior: fail open, do not falsely block legitimate users
  assert.equal(decision.allowed, true);
  assert.equal(decision.classification, "NORMAL");
  assert.equal(decision.degraded, true);
});

test.after(async () => {
  await client.close();
});
