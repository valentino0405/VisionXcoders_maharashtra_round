import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

import { MongoClient } from "mongodb";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI environment variable is not configured");
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("Upstash Redis environment variables are not configured");
}

const client = new MongoClient(mongoUri);
const redis = new Redis({ url: redisUrl, token: redisToken });
let connected = false;
let redisWritten = false;
const runId = randomUUID().replaceAll("-", "");
const sameUserId = `test_same_${runId}`;
const differentUserIds = Array.from({ length: 20 }, (_, index) => `test_multi_${runId}_${index}`);
const testUserIds = [sameUserId, ...differentUserIds];
const redisKey = `fairdrop:test:participant:fairdrop-demo:${sameUserId}`;

function participationUpdate(clerkId) {
  const now = new Date();

  return {
    $setOnInsert: {
      participantId: `p_${randomUUID().replaceAll("-", "")}`,
      dropId: "fairdrop-demo",
      clerkId,
      joinedAt: now,
      status: "JOINED",
      createdAt: now,
      updatedAt: now,
    },
  };
}

try {
  await client.connect();
  connected = true;

  const database = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = database.collection("participations");

  await participations.createIndex({ dropId: 1, clerkId: 1 }, { unique: true });

  const repeatedResults = await Promise.all(
    Array.from({ length: 100 }, () =>
      participations.findOneAndUpdate(
        { dropId: "fairdrop-demo", clerkId: sameUserId },
        participationUpdate(sameUserId),
        { upsert: true, returnDocument: "after" }
      )
    )
  );

  assert.equal(
    await participations.countDocuments({ dropId: "fairdrop-demo", clerkId: sameUserId }),
    1
  );
  assert.equal(new Set(repeatedResults.map((result) => result?.participantId)).size, 1);

  await Promise.all(
    differentUserIds.map((clerkId) =>
      participations.findOneAndUpdate(
        { dropId: "fairdrop-demo", clerkId },
        participationUpdate(clerkId),
        { upsert: true, returnDocument: "after" }
      )
    )
  );

  assert.equal(
    await participations.countDocuments({
      dropId: "fairdrop-demo",
      clerkId: { $in: differentUserIds },
    }),
    differentUserIds.length
  );

  const redisParticipant = {
    participantId: repeatedResults[0].participantId,
    dropId: "fairdrop-demo",
    status: "JOINED",
  };

  await redis.set(redisKey, redisParticipant);
  redisWritten = true;
  assert.deepEqual(await redis.get(redisKey), redisParticipant);

  console.log("MongoDB concurrency and Redis state verification passed");
} finally {
  if (redisWritten) {
    await redis.del(redisKey);
  }

  if (connected) {
    const database = client.db(process.env.MONGODB_DB || "bitnbuild");
    await database.collection("participations").deleteMany({
      dropId: "fairdrop-demo",
      clerkId: { $in: testUserIds },
    });
  }

  await client.close();
}
