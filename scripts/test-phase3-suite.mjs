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

const RESERVE_QUEUE_ENTRY_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return redis.call("HMGET", KEYS[1], "queueEntryId", "dropId", "participantId", "sequence", "status", "joinedAt")
end

local sequence = redis.call("INCR", KEYS[2])
redis.call("HSET", KEYS[1],
  "queueEntryId", ARGV[1],
  "dropId", ARGV[2],
  "participantId", ARGV[3],
  "sequence", sequence,
  "status", "WAITING",
  "joinedAt", ARGV[4]
)

return {ARGV[1], ARGV[2], ARGV[3], tostring(sequence), "WAITING", ARGV[4]}
`;

test("Phase 3: Database indexes for queueEntries", async () => {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const queueEntries = db.collection("queueEntries");
  const indexes = await queueEntries.indexes();

  const participantUnique = indexes.find(
    (idx) => idx.key?.dropId === 1 && idx.key?.participantId === 1 && idx.unique === true
  );
  const sequenceUnique = indexes.find(
    (idx) => idx.key?.dropId === 1 && idx.key?.sequence === 1 && idx.unique === true
  );

  assert.ok(participantUnique, "Unique compound index { dropId: 1, participantId: 1 } must exist");
  assert.ok(sequenceUnique, "Unique compound index { dropId: 1, sequence: 1 } must exist");
});

test("Phase 3: Redis atomic Lua reservation under 100 concurrent same-user requests", async () => {
  const runId = randomUUID().replaceAll("-", "");
  const environment = `test-${runId}`;
  const dropId = "fairdrop-demo";
  const participantId = `p_test_${runId}`;
  const entryKey = `fairdrop:${environment}:queue:entry:${dropId}:${participantId}`;
  const sequenceKey = `fairdrop:${environment}:queue:sequence:${dropId}`;

  try {
    const promises = Array.from({ length: 100 }, () => {
      const queueEntryId = `q_${randomUUID().replaceAll("-", "")}`;
      const joinedAt = new Date().toISOString();
      return redis.eval(
        RESERVE_QUEUE_ENTRY_SCRIPT,
        [entryKey, sequenceKey],
        [queueEntryId, dropId, participantId, joinedAt]
      );
    });

    const results = await Promise.all(promises);
    const sequences = new Set(results.map((r) => r[3]));
    const queueEntryIds = new Set(results.map((r) => r[0]));

    assert.equal(sequences.size, 1, "All 100 concurrent requests must receive the exact same sequence number");
    assert.equal(queueEntryIds.size, 1, "All 100 concurrent requests must retain the exact same queueEntryId");
  } finally {
    await redis.del(entryKey, sequenceKey);
  }
});

test("Phase 3: 100 different users receive strictly unique and sequential sequences", async () => {
  const runId = randomUUID().replaceAll("-", "");
  const environment = `test-${runId}`;
  const dropId = "fairdrop-demo";
  const userCount = 100;
  const participantIds = Array.from({ length: userCount }, (_, i) => `p_multi_${runId}_${i}`);
  const sequenceKey = `fairdrop:${environment}:queue:sequence:${dropId}`;
  const entryKeys = participantIds.map((p) => `fairdrop:${environment}:queue:entry:${dropId}:${p}`);

  try {
    const promises = participantIds.map((participantId) => {
      const queueEntryId = `q_${randomUUID().replaceAll("-", "")}`;
      const joinedAt = new Date().toISOString();
      return redis.eval(
        RESERVE_QUEUE_ENTRY_SCRIPT,
        [`fairdrop:${environment}:queue:entry:${dropId}:${participantId}`, sequenceKey],
        [queueEntryId, dropId, participantId, joinedAt]
      );
    });

    const results = await Promise.all(promises);
    const seqNumbers = results.map((r) => Number(r[3]));
    const uniqueSeqs = new Set(seqNumbers);

    assert.equal(uniqueSeqs.size, userCount, "All 100 participants must receive completely unique sequences");
    const minSeq = Math.min(...seqNumbers);
    const maxSeq = Math.max(...seqNumbers);
    assert.equal(maxSeq - minSeq + 1, userCount, "Sequences must have zero gaps across atomic increments");
  } finally {
    await redis.del(sequenceKey, ...entryKeys);
  }
});

test("Phase 3: Token validation, tampering, expiration, and cross-boundary security", async () => {
  const { issueQueueToken, verifyQueueTokenDetailed, getQueueTokenSecret } = await import(
    "../lib/queue-token.ts"
  );

  const secret = tokenSecret;
  const identity = {
    dropId: "fairdrop-demo",
    participantId: "p_user_100",
    queueEntryId: "q_entry_500",
  };

  const now = new Date("2026-10-03T12:00:00.000Z");
  const token = issueQueueToken(identity, secret, now);

  // 1. Valid token
  const validCheck = verifyQueueTokenDetailed(token, identity, secret, now);
  assert.equal(validCheck.valid, true);

  // 2. Tampered token
  const tamperedToken = token.slice(0, -4) + "XXXX";
  const tamperedCheck = verifyQueueTokenDetailed(tamperedToken, identity, secret, now);
  assert.equal(tamperedCheck.valid, false);
  assert.equal(tamperedCheck.reason, "INVALID_SIGNATURE");

  // 3. Expired token (25 hours later, lifetime is 24 hours)
  const expiredTime = new Date(now.getTime() + 25 * 3600 * 1000);
  const expiredCheck = verifyQueueTokenDetailed(token, identity, secret, expiredTime);
  assert.equal(expiredCheck.valid, false);
  assert.equal(expiredCheck.reason, "EXPIRED");

  // 4. Cross-participant token reuse
  const crossParticipantCheck = verifyQueueTokenDetailed(
    token,
    { ...identity, participantId: "p_user_VICTIM" },
    secret,
    now
  );
  assert.equal(crossParticipantCheck.valid, false);
  assert.equal(crossParticipantCheck.reason, "CROSS_PARTICIPANT");

  // 5. Cross-drop token reuse
  const crossDropCheck = verifyQueueTokenDetailed(
    token,
    { ...identity, dropId: "different-drop" },
    secret,
    now
  );
  assert.equal(crossDropCheck.valid, false);
  assert.equal(crossDropCheck.reason, "CROSS_DROP");

  // 6. Cross-queue-entry token reuse
  const crossEntryCheck = verifyQueueTokenDetailed(
    token,
    { ...identity, queueEntryId: "q_other_entry" },
    secret,
    now
  );
  assert.equal(crossEntryCheck.valid, false);
  assert.equal(crossEntryCheck.reason, "CROSS_QUEUE_ENTRY");

  // 7. Malformed token strings
  assert.equal(verifyQueueTokenDetailed("not.a.valid.token.at.all", identity, secret, now).valid, false);
  assert.equal(verifyQueueTokenDetailed("", identity, secret, now).valid, false);
  assert.equal(verifyQueueTokenDetailed("garbage", identity, secret, now).valid, false);
});

test.after(async () => {
  await client.close();
});
