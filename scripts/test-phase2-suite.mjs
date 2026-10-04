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

const client = new MongoClient(mongoUri);
const redis = new Redis({ url: redisUrl, token: redisToken });

test("Phase 2: Database schema and unique compound index validation", async () => {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = db.collection("participations");
  const indexes = await participations.indexes();

  const uniqueIndex = indexes.find(
    (idx) => idx.key && idx.key.dropId === 1 && idx.key.clerkId === 1 && idx.unique === true
  );
  assert.ok(uniqueIndex, "Compound unique index { dropId: 1, clerkId: 1 } must exist in participations collection");
});

test("Phase 2: 100 concurrent same-user join requests create exactly 1 participation record", async () => {
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = db.collection("participations");
  const runId = randomUUID().replaceAll("-", "");
  const testUserId = `audit_user_${runId}`;
  const dropId = "fairdrop-demo";

  try {
    const promises = Array.from({ length: 100 }, () => {
      const now = new Date();
      return participations.findOneAndUpdate(
        { dropId, clerkId: testUserId },
        {
          $setOnInsert: {
            participantId: `p_${randomUUID().replaceAll("-", "")}`,
            dropId,
            clerkId: testUserId,
            status: "JOINED",
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
    });

    const results = await Promise.all(promises);
    const count = await participations.countDocuments({ dropId, clerkId: testUserId });
    assert.equal(count, 1, "Exactly one document must be created for 100 concurrent requests from same user");

    const participantIds = new Set(results.map((r) => r.participantId));
    assert.equal(participantIds.size, 1, "All 100 concurrent requests must return the same participantId");
  } finally {
    await participations.deleteMany({ dropId, clerkId: testUserId });
  }
});

test("Phase 2: 50 concurrent different users receive 50 distinct participation records", async () => {
  const db = client.db(process.env.MONGODB_DB || "bitnbuild");
  const participations = db.collection("participations");
  const runId = randomUUID().replaceAll("-", "");
  const userIds = Array.from({ length: 50 }, (_, i) => `audit_multi_${runId}_${i}`);
  const dropId = "fairdrop-demo";

  try {
    const promises = userIds.map((userId) => {
      const now = new Date();
      return participations.findOneAndUpdate(
        { dropId, clerkId: userId },
        {
          $setOnInsert: {
            participantId: `p_${randomUUID().replaceAll("-", "")}`,
            dropId,
            clerkId: userId,
            status: "JOINED",
            joinedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
    });

    const results = await Promise.all(promises);
    const count = await participations.countDocuments({ dropId, clerkId: { $in: userIds } });
    assert.equal(count, 50, "All 50 distinct users must have distinct records in MongoDB");

    const participantIds = new Set(results.map((r) => r.participantId));
    assert.equal(participantIds.size, 50, "All 50 participantIds must be unique");
  } finally {
    await participations.deleteMany({ dropId, clerkId: { $in: userIds } });
  }
});

test("Phase 2: Missing drop and inactive drop validations", async () => {
  const { joinDrop, DropEngineError } = await import("../lib/drop-engine.ts");

  // Missing drop
  await assert.rejects(
    joinDrop("non-existent-drop-id", "clerk_123", {
      getDrop: async () => null,
      upsertParticipation: async () => ({ participant: { participantId: "p1", dropId: "x", status: "JOINED" }, created: true }),
      cacheParticipant: async () => { },
      createParticipantId: () => "p1",
    }),
    (err) => err instanceof DropEngineError && err.code === "DROP_NOT_FOUND"
  );

  // Inactive status
  await assert.rejects(
    joinDrop("inactive-drop", "clerk_123", {
      getDrop: async () => ({ status: "INACTIVE", startsAt: new Date(Date.now() - 10000), endsAt: null }),
      upsertParticipation: async () => ({ participant: { participantId: "p1", dropId: "x", status: "JOINED" }, created: true }),
      cacheParticipant: async () => { },
      createParticipantId: () => "p1",
    }),
    (err) => err instanceof DropEngineError && err.code === "DROP_NOT_ACTIVE"
  );

  // Future drop (not started yet)
  await assert.rejects(
    joinDrop("future-drop", "clerk_123", {
      getDrop: async () => ({ status: "ACTIVE", startsAt: new Date(Date.now() + 100000), endsAt: null }),
      upsertParticipation: async () => ({ participant: { participantId: "p1", dropId: "x", status: "JOINED" }, created: true }),
      cacheParticipant: async () => { },
      createParticipantId: () => "p1",
    }),
    (err) => err instanceof DropEngineError && err.code === "DROP_NOT_ACTIVE"
  );

  // Ended drop
  await assert.rejects(
    joinDrop("ended-drop", "clerk_123", {
      getDrop: async () => ({ status: "ACTIVE", startsAt: new Date(Date.now() - 200000), endsAt: new Date(Date.now() - 100000) }),
      upsertParticipation: async () => ({ participant: { participantId: "p1", dropId: "x", status: "JOINED" }, created: true }),
      cacheParticipant: async () => { },
      createParticipantId: () => "p1",
    }),
    (err) => err instanceof DropEngineError && err.code === "DROP_NOT_ACTIVE"
  );
});

test.after(async () => {
  await client.close();
});
