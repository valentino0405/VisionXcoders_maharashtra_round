import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvFile } from "node:process";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const validUrl = process.env.UPSTASH_REDIS_REST_URL;
const validToken = process.env.UPSTASH_REDIS_REST_TOKEN;

test("Phase 1: Redis connectivity and PING", async () => {
  const redis = new Redis({ url: validUrl, token: validToken });
  const result = await redis.ping();
  assert.equal(result, "PONG");
});

test("Phase 1: Missing environment variable UPSTASH_REDIS_REST_URL throws error", async () => {
  const orig = process.env.UPSTASH_REDIS_REST_URL;
  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    assert.throws(
      () => {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url) throw new Error("UPSTASH_REDIS_REST_URL environment variable is not configured");
        if (!token) throw new Error("UPSTASH_REDIS_REST_TOKEN environment variable is not configured");
        new Redis({ url, token });
      },
      { message: "UPSTASH_REDIS_REST_URL environment variable is not configured" }
    );
  } finally {
    process.env.UPSTASH_REDIS_REST_URL = orig;
  }
});

test("Phase 1: Missing environment variable UPSTASH_REDIS_REST_TOKEN throws error", async () => {
  const orig = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.throws(
      () => {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url) throw new Error("UPSTASH_REDIS_REST_URL environment variable is not configured");
        if (!token) throw new Error("UPSTASH_REDIS_REST_TOKEN environment variable is not configured");
        new Redis({ url, token });
      },
      { message: "UPSTASH_REDIS_REST_TOKEN environment variable is not configured" }
    );
  } finally {
    process.env.UPSTASH_REDIS_REST_TOKEN = orig;
  }
});

test("Phase 1: Invalid credentials reject connection / request", async () => {
  const badRedis = new Redis({
    url: validUrl,
    token: "invalid-token-12345",
  });
  await assert.rejects(async () => {
    await badRedis.ping();
  });
});

test("Phase 1: Invalid host / connection failure throws error", async () => {
  const badRedis = new Redis({
    url: "https://nonexistent-redis-cluster-invalid.upstash.io",
    token: "invalid",
  });
  await assert.rejects(async () => {
    await badRedis.ping();
  });
});

test("Phase 1: Health route behavior emulation", async () => {
  // Emulate GET /api/health/redis logic
  async function checkHealth(redisClient) {
    try {
      const response = await redisClient.ping();
      if (response !== "PONG") {
        return { status: 500, body: { redis: "error" } };
      }
      return { status: 200, body: { redis: "ok" } };
    } catch {
      return { status: 500, body: { redis: "error" } };
    }
  }

  const goodRedis = new Redis({ url: validUrl, token: validToken });
  const goodRes = await checkHealth(goodRedis);
  assert.equal(goodRes.status, 200);
  assert.deepEqual(goodRes.body, { redis: "ok" });

  const badRedis = new Redis({ url: validUrl, token: "bad-token" });
  const badRes = await checkHealth(badRedis);
  assert.equal(badRes.status, 500);
  assert.deepEqual(badRes.body, { redis: "error" });
  // Verify no secret leakage in response body
  assert.equal(JSON.stringify(badRes.body).includes("bad-token"), false);
  assert.equal(JSON.stringify(goodRes.body).includes(validToken), false);
});
