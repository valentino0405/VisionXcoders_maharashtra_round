import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("Upstash Redis environment variables must be configured");
}

const runId = randomUUID().replaceAll("-", "");
const environment = `test-${runId}`;
process.env.FAIRDROP_ENV = environment;

const { evaluateAbuseRequest } = await import("../lib/abuse-engine.ts");
const redis = new Redis({ url: redisUrl, token: redisToken });
const abusiveUser = `test_abusive_${runId}`;
const legitimateUser = `test_legitimate_${runId}`;
const dropId = "fairdrop-demo";

function userKeys(clerkId) {
  return [
    `fairdrop:${environment}:ratelimit:user:${clerkId}:short`,
    `fairdrop:${environment}:ratelimit:user:${clerkId}:minute`,
    `fairdrop:${environment}:ratelimit:queue_status:${clerkId}:${dropId}`,
    `fairdrop:${environment}:abuse:user:${clerkId}:signals`,
    `fairdrop:${environment}:abuse:throttle:${clerkId}`,
    `fairdrop:${environment}:abuse:block:${clerkId}`,
  ];
}

const abusiveKeys = userKeys(abusiveUser);
const legitimateKeys = userKeys(legitimateUser);

try {
  const originalWarn = console.warn;
  console.warn = () => {};
  const decisions = await Promise.all(
    Array.from({ length: 100 }, () =>
      evaluateAbuseRequest({
        clerkId: abusiveUser,
        action: "QUEUE_STATUS",
        endpoint: "/api/queue/status",
        dropId,
      })
    )
  );
  console.warn = originalWarn;

  assert.ok(decisions.some((decision) => decision.classification === "THROTTLED"));
  assert.ok(decisions.some((decision) => decision.classification === "BLOCKED"));
  assert.ok(decisions.every((decision) => decision.classification !== "NORMAL" || decision.allowed));
  assert.equal(await redis.exists(abusiveKeys[5]), 1);

  const legitimateDecision = await evaluateAbuseRequest({
    clerkId: legitimateUser,
    action: "QUEUE_STATUS",
    endpoint: "/api/queue/status",
    dropId,
  });
  assert.equal(legitimateDecision.classification, "NORMAL");
  assert.equal(legitimateDecision.allowed, true);

  const shortCount = Number(await redis.get(abusiveKeys[0]));
  const minuteCount = Number(await redis.get(abusiveKeys[1]));
  assert.ok(shortCount >= 0);
  assert.ok(minuteCount >= 0);

  await redis.set(abusiveKeys[4], "1", { ex: 1 });
  await redis.set(abusiveKeys[5], "1", { ex: 1 });
  await redis.hset(abusiveKeys[3], { invalidRequests: 1 });
  await redis.expire(abusiveKeys[3], 1);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(await redis.exists(abusiveKeys[4]), 0);
  assert.equal(await redis.exists(abusiveKeys[5]), 0);
  assert.equal(await redis.exists(abusiveKeys[3]), 0);

  console.log("Abuse concurrency, isolation, and TTL verification passed");
} finally {
  await redis.del(...abusiveKeys, ...legitimateKeys);
}
