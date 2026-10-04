import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { Redis } from "@upstash/redis";

loadEnvFile(".env.local");

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url: redisUrl, token: redisToken });

test("Phase 4: Classification thresholds and classifications mapping", async () => {
  const { classifyAbuse } = await import("../lib/abuse-engine.ts");
  const base = {
    requestShort: 1,
    requestMinute: 1,
    actionRequests: 1,
    duplicateDropJoins: 0,
    duplicateQueueJoins: 0,
    tokenFailures: 0,
    crossParticipantTokens: 0,
    crossDropTokens: 0,
    invalidRequests: 0,
    repeatedThrottled: 0,
    rateLimitExceeded: 0,
    bursts: 0,
  };

  // 1. NORMAL
  const dNormal = classifyAbuse(base, "QUEUE_STATUS");
  assert.equal(dNormal.classification, "NORMAL");
  assert.equal(dNormal.allowed, true);

  // 2. LOW_RISK (1 duplicate attempt)
  const dLow = classifyAbuse({ ...base, duplicateQueueJoins: 1 }, "QUEUE_JOIN");
  assert.equal(dLow.classification, "LOW_RISK");
  assert.equal(dLow.allowed, true);

  // 3. SUSPICIOUS (4 duplicates or 3 token failures or 2 ownership mismatches)
  const dSusp1 = classifyAbuse({ ...base, duplicateQueueJoins: 4 }, "QUEUE_JOIN");
  assert.equal(dSusp1.classification, "SUSPICIOUS");
  assert.equal(dSusp1.allowed, true);

  const dSusp2 = classifyAbuse({ ...base, tokenFailures: 3 }, "QUEUE_STATUS");
  assert.equal(dSusp2.classification, "SUSPICIOUS");
  assert.equal(dSusp2.allowed, true);

  const dSusp3 = classifyAbuse({ ...base, crossParticipantTokens: 2 }, "QUEUE_STATUS");
  assert.equal(dSusp3.classification, "SUSPICIOUS");
  assert.equal(dSusp3.allowed, true);

  // 4. THROTTLED
  const dThrottled = classifyAbuse(base, "DROP_JOIN", "THROTTLED", 30);
  assert.equal(dThrottled.classification, "THROTTLED");
  assert.equal(dThrottled.allowed, false);
  assert.equal(dThrottled.retryAfterSeconds, 30);

  // 5. BLOCKED
  const dBlocked = classifyAbuse(base, "QUEUE_STATUS", "BLOCKED", 300);
  assert.equal(dBlocked.classification, "BLOCKED");
  assert.equal(dBlocked.allowed, false);
});

test("Phase 4: HTTP Enforcement response mapping", async () => {
  const { abuseEnforcementResponse } = await import("../lib/abuse-http.ts");

  // Normal returns null (allowed)
  const rNormal = abuseEnforcementResponse({ classification: "NORMAL", allowed: true, reasons: [], signals: [] });
  assert.equal(rNormal, null);

  // Throttled returns 429 with Retry-After
  const rThrottled = abuseEnforcementResponse({
    classification: "THROTTLED",
    allowed: false,
    retryAfterSeconds: 45,
    reasons: ["Rate limit exceeded"],
    signals: [],
  });
  assert.ok(rThrottled);
  assert.equal(rThrottled.status, 429);
  assert.equal(rThrottled.headers.get("Retry-After"), "45");
  const throttledBody = await rThrottled.json();
  assert.equal(throttledBody.error, "RATE_LIMITED");
  assert.equal(throttledBody.classification, "THROTTLED");
  assert.equal(throttledBody.retryAfterSeconds, 45);

  // Blocked returns 403
  const rBlocked = abuseEnforcementResponse({
    classification: "BLOCKED",
    allowed: false,
    reasons: ["Blocked"],
    signals: [],
  });
  assert.ok(rBlocked);
  assert.equal(rBlocked.status, 403);
  const blockedBody = await rBlocked.json();
  assert.equal(blockedBody.error, "ACCESS_BLOCKED");
  assert.equal(blockedBody.classification, "BLOCKED");
});

test("Phase 4: Live Redis Lua script state transitions, bursts, and TTL isolation", async () => {
  const { evaluateAbuseRequest, recordAbuseEvent } = await import("../lib/abuse-engine.ts");
  const runId = randomUUID().replaceAll("-", "");
  const env = `test-${runId}`;
  process.env.FAIRDROP_ENV = env;

  const attacker = `attacker_${runId}`;
  const victim = `legitimate_${runId}`;
  const dropId = "fairdrop-demo";

  try {
    // 1. Legitimate user does 1 request: NORMAL
    const leg1 = await evaluateAbuseRequest({ clerkId: victim, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
    assert.equal(leg1.classification, "NORMAL");
    assert.equal(leg1.allowed, true);

    // 2. Attacker floods with 25 requests in short burst (> shortLimit: 20)
    const attackerDecisions = [];
    for (let i = 0; i < 25; i++) {
      const dec = await evaluateAbuseRequest({ clerkId: attacker, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
      attackerDecisions.push(dec);
    }

    // Must be throttled
    const throttledCount = attackerDecisions.filter((d) => d.classification === "THROTTLED").length;
    assert.ok(throttledCount > 0, "Attacker burst must trigger THROTTLED status");

    // 3. Repeated requests while throttled triggers temporary BLOCKED (>= 5 requests while throttled)
    const blockedDecisions = [];
    for (let i = 0; i < 6; i++) {
      const dec = await evaluateAbuseRequest({ clerkId: attacker, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
      blockedDecisions.push(dec);
    }
    assert.ok(blockedDecisions.some((d) => d.classification === "BLOCKED"), "Attacker must transition to BLOCKED after 5 requests while throttled");

    // 4. Isolation verification: Legitimate user must STILL be NORMAL and ALLOWED
    const leg2 = await evaluateAbuseRequest({ clerkId: victim, action: "QUEUE_STATUS", endpoint: "/api/queue/status", dropId }, redis);
    assert.equal(leg2.classification, "NORMAL", "Legitimate user must not be affected by attacker actions");
    assert.equal(leg2.allowed, true);

    // 5. Abuse event recording (Token failures)
    for (let i = 0; i < 3; i++) {
      await recordAbuseEvent({ clerkId: attacker, action: "QUEUE_STATUS", event: "INVALID_QUEUE_TOKEN", endpoint: "/api/queue/status", dropId }, redis);
    }
  } finally {
    // Clean up test keys
    const keys = await redis.keys(`fairdrop:${env}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
});
