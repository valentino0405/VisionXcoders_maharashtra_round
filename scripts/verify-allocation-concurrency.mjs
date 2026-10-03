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
  return {"EXISTING", unpack(redis.call("HMGET", KEYS[1], "allocationId", "dropId", "participantId", "queueEntryId", "queueSequence", "seatId", "status", "allocatedAt"))}
end
if tonumber(ARGV[5]) > tonumber(ARGV[8]) then return {"NOT_ELIGIBLE"} end
if redis.call("EXISTS", KEYS[2]) == 1 then return {"CONFLICT"} end
redis.call("HSET", KEYS[1], "allocationId", ARGV[1], "dropId", ARGV[2], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "PENDING_PERSISTENCE", "allocatedAt", ARGV[7])
redis.call("HSET", KEYS[2], "allocationId", ARGV[1], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "PENDING_PERSISTENCE")
return {"RESERVED", ARGV[1], ARGV[2], ARGV[3], ARGV[4], ARGV[5], ARGV[6], "PENDING_PERSISTENCE", ARGV[7]}
`;

const runId = randomUUID().replaceAll("-", "");
const environment = `test-${runId}`;
const dropId = `allocation-test-${runId}`;
const capacity = 500;
const participants = Array.from({ length: 1_000 }, (_, index) => {
  const sequence = index + 1;
  const participantId = `p_allocation_${runId}_${sequence}`;
  const seatId = `${dropId}-seat-${String(sequence).padStart(3, "0")}`;
  return { participantId, sequence, seatId, queueEntryId: `q_allocation_${runId}_${sequence}` };
});
const redis = new Redis({ url: redisUrl, token: redisToken });
const mongo = new MongoClient(mongoUri);
let connected = false;

function participantKey(participantId) {
  return `fairdrop:${environment}:allocation:participant:${dropId}:${participantId}`;
}

function seatKey(seatId) {
  return `fairdrop:${environment}:allocation:seat:${dropId}:${seatId}`;
}

async function reserve(participant) {
  const allocatedAt = new Date().toISOString();
  return redis.eval(
    reserveScript,
    [participantKey(participant.participantId), seatKey(participant.seatId)],
    [
      `a_${participant.participantId}`,
      dropId,
      participant.participantId,
      participant.queueEntryId,
      participant.sequence,
      participant.seatId,
      allocatedAt,
      capacity,
    ]
  );
}

try {
  await mongo.connect();
  connected = true;
  const allocations = mongo.db(process.env.MONGODB_DB || "bitnbuild").collection("allocations");
  await allocations.createIndex({ allocationId: 1 }, { unique: true });
  await allocations.createIndex({ dropId: 1, participantId: 1 }, { unique: true });
  await allocations.createIndex({ dropId: 1, seatId: 1 }, { unique: true });
  await allocations.createIndex({ dropId: 1, queueEntryId: 1 }, { unique: true });

  const reservations = await Promise.all(participants.map(reserve));
  const eligible = reservations.filter((reservation) => reservation[0] === "RESERVED");
  assert.equal(eligible.length, capacity);
  assert.equal(reservations.filter((reservation) => reservation[0] === "NOT_ELIGIBLE").length, 500);
  assert.equal(new Set(eligible.map((reservation) => reservation[6])).size, capacity);

  const repeated = await Promise.all(Array.from({ length: 100 }, () => reserve(participants[0])));
  assert.equal(new Set(repeated.map((reservation) => reservation[0])).size, 1);
  assert.equal(new Set(repeated.map((reservation) => reservation[6])).size, 1);

  await Promise.all(eligible.map((reservation) => {
    const allocation = {
      allocationId: reservation[1], dropId: reservation[2], participantId: reservation[3], queueEntryId: reservation[4],
      queueSequence: Number(reservation[5]), seatId: reservation[6], status: "ALLOCATED", allocatedAt: new Date(reservation[8]),
      clerkId: `test_${reservation[3]}`, createdAt: new Date(), updatedAt: new Date(),
    };
    return allocations.updateOne({ dropId, participantId: allocation.participantId }, { $setOnInsert: allocation }, { upsert: true });
  }));
  assert.equal(await allocations.countDocuments({ dropId }), capacity);
  assert.equal((await allocations.distinct("seatId", { dropId })).length, capacity);
  console.log("Allocation Redis and MongoDB concurrency verification passed");
} finally {
  if (connected) {
    await mongo.db(process.env.MONGODB_DB || "bitnbuild").collection("allocations").deleteMany({ dropId });
  }
  await mongo.close();
  await redis.del(
    ...participants.map((participant) => participantKey(participant.participantId)),
    ...participants.slice(0, capacity).map((participant) => seatKey(participant.seatId))
  );
}
