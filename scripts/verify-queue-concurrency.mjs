import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

import { MongoClient } from "mongodb";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!mongoUri || !redisUrl || !redisToken) {
  throw new Error("MongoDB and Upstash Redis environment variables must be configured");
}

const reserveScript = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return redis.call("HMGET", KEYS[1], "queueEntryId", "dropId", "participantId", "sequence", "status", "joinedAt")
end
local sequence = redis.call("INCR", KEYS[2])
redis.call("HSET", KEYS[1], "queueEntryId", ARGV[1], "dropId", ARGV[2], "participantId", ARGV[3], "sequence", sequence, "status", "WAITING", "joinedAt", ARGV[4])
return {ARGV[1], ARGV[2], ARGV[3], tostring(sequence), "WAITING", ARGV[4]}
`;

const runId = randomUUID().replaceAll("-", "");
const environment = `test-${runId}`;
const dropId = "fairdrop-demo";
const sameParticipantId = `p_test_same_${runId}`;
const differentParticipantIds = Array.from(
  { length: 100 },
  (_, index) => `p_test_multi_${runId}_${index}`
);
const participantIds = [sameParticipantId, ...differentParticipantIds];
const sequenceKey = `fairdrop:${environment}:queue:sequence:${dropId}`;
const orderKey = `fairdrop:${environment}:queue:order:${dropId}`;
const entryKeys = participantIds.map(
  (participantId) => `fairdrop:${environment}:queue:entry:${dropId}:${participantId}`
);
const redis = new Redis({ url: redisUrl, token: redisToken });
const mongo = new MongoClient(mongoUri);
let mongoConnected = false;

async function reserve(participantId) {
  const joinedAt = new Date().toISOString();
  return redis.eval(
    reserveScript,
    [`fairdrop:${environment}:queue:entry:${dropId}:${participantId}`, sequenceKey],
    [`q_${randomUUID().replaceAll("-", "")}`, dropId, participantId, joinedAt]
  );
}

try {
  await redis.set(sequenceKey, Date.now() * 1000);
  await mongo.connect();
  mongoConnected = true;

  const database = mongo.db(process.env.MONGODB_DB || "bitnbuild");
  const queueEntries = database.collection("queueEntries");
  await queueEntries.createIndex({ dropId: 1, participantId: 1 }, { unique: true });
  await queueEntries.createIndex({ dropId: 1, sequence: 1 }, { unique: true });

  const repeatedReservations = await Promise.all(
    Array.from({ length: 100 }, () => reserve(sameParticipantId))
  );
  assert.equal(new Set(repeatedReservations.map((value) => value[0])).size, 1);
  assert.equal(new Set(repeatedReservations.map((value) => Number(value[3]))).size, 1);

  const differentReservations = await Promise.all(
    differentParticipantIds.map((participantId) => reserve(participantId))
  );
  assert.equal(new Set(differentReservations.map((value) => Number(value[3]))).size, 100);

  const allReservations = [repeatedReservations[0], ...differentReservations];
  await Promise.all(
    allReservations.map((value) => {
      const now = new Date(value[5]);
      return queueEntries.findOneAndUpdate(
        { dropId, participantId: value[2] },
        {
          $setOnInsert: {
            queueEntryId: value[0],
            dropId,
            participantId: value[2],
            clerkId: `test_${value[2]}`,
            sequence: Number(value[3]),
            status: "WAITING",
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
    })
  );

  assert.equal(
    await queueEntries.countDocuments({ dropId, participantId: { $in: participantIds } }),
    participantIds.length
  );

  await Promise.all(
    allReservations.map((value) =>
      redis.zadd(orderKey, { score: Number(value[3]), member: value[2] })
    )
  );
  assert.equal(await redis.zcard(orderKey), participantIds.length);

  console.log("Queue MongoDB and Redis concurrency verification passed");
} finally {
  if (mongoConnected) {
    await mongo
      .db(process.env.MONGODB_DB || "bitnbuild")
      .collection("queueEntries")
      .deleteMany({ dropId, participantId: { $in: participantIds } });
  }
  await mongo.close();
  await redis.del(sequenceKey, orderKey, ...entryKeys);
}
