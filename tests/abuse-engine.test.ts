import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAbuse,
  evaluateAbuseRequest,
  type SignalSnapshot,
} from "../lib/abuse-engine.ts";
import { issueQueueToken, verifyQueueTokenDetailed } from "../lib/queue-token.ts";

const EMPTY: SignalSnapshot = {
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

test("normal requests remain NORMAL", () => {
  const decision = classifyAbuse(EMPTY, "QUEUE_STATUS");
  assert.equal(decision.classification, "NORMAL");
  assert.equal(decision.allowed, true);
});

test("one duplicate or invalid request is LOW_RISK and allowed", () => {
  for (const snapshot of [
    { ...EMPTY, duplicateQueueJoins: 1 },
    { ...EMPTY, invalidRequests: 1 },
    { ...EMPTY, tokenFailures: 1 },
  ]) {
    const decision = classifyAbuse(snapshot, "QUEUE_JOIN");
    assert.equal(decision.classification, "LOW_RISK");
    assert.equal(decision.allowed, true);
  }
});

test("repeated abnormal signals become SUSPICIOUS without changing queue state", () => {
  const decision = classifyAbuse(
    { ...EMPTY, duplicateQueueJoins: 4, invalidRequests: 4 },
    "QUEUE_JOIN"
  );
  assert.equal(decision.classification, "SUSPICIOUS");
  assert.equal(decision.allowed, true);
  assert.ok(decision.signals.some((signal) => signal.name === "DUPLICATE_JOIN_ATTEMPTS"));
});

test("explicit throttling returns a retry duration", () => {
  const decision = classifyAbuse(
    { ...EMPTY, requestShort: 21, rateLimitExceeded: 1, bursts: 1 },
    "DROP_JOIN",
    "THROTTLED",
    30
  );
  assert.equal(decision.classification, "THROTTLED");
  assert.equal(decision.allowed, false);
  assert.equal(decision.retryAfterSeconds, 30);
});

test("continued requests while throttled can produce a temporary block", () => {
  const decision = classifyAbuse(
    { ...EMPTY, repeatedThrottled: 5 },
    "QUEUE_STATUS",
    "BLOCKED",
    300
  );
  assert.equal(decision.classification, "BLOCKED");
  assert.equal(decision.allowed, false);
});

test("expired throttle and block state returns to normal", () => {
  const afterExpiration = classifyAbuse(EMPTY, "QUEUE_STATUS", "NONE");
  assert.equal(afterExpiration.classification, "NORMAL");
  assert.equal(afterExpiration.allowed, true);
});

test("Redis failure fails open without inventing abuse", async () => {
  const failingRedis = {
    eval: async () => {
      throw new Error("Redis unavailable");
    },
  };
  const decision = await evaluateAbuseRequest(
    {
      clerkId: "user_1",
      action: "QUEUE_STATUS",
      endpoint: "/api/queue/status",
    },
    failingRedis as never
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.classification, "NORMAL");
  assert.equal(decision.degraded, true);
});

test("token verification distinguishes tampering and ownership mismatches", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const secret = "test-only-queue-token-secret-32-characters";
  const identity = {
    dropId: "fairdrop-demo",
    participantId: "p_1",
    queueEntryId: "q_1",
  };
  const token = issueQueueToken(identity, secret, now);

  assert.equal(
    verifyQueueTokenDetailed(`${token}x`, identity, secret, now).valid,
    false
  );
  const participantMismatch = verifyQueueTokenDetailed(
    token,
    { ...identity, participantId: "p_2" },
    secret,
    now
  );
  assert.deepEqual(participantMismatch, { valid: false, reason: "CROSS_PARTICIPANT" });
  const dropMismatch = verifyQueueTokenDetailed(
    token,
    { ...identity, dropId: "other-drop" },
    secret,
    now
  );
  assert.deepEqual(dropMismatch, { valid: false, reason: "CROSS_DROP" });
});
