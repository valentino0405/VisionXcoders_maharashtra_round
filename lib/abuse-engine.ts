import "server-only";

import type { Redis } from "@upstash/redis";

import { ABUSE_POLICY, type AbuseAction, type AbuseEventType } from "./abuse-policy.ts";
import { getFairDropEnvironment } from "./drop-engine.ts";
import { getRedisClient } from "./redis.ts";

export type AbuseClassification =
  | "NORMAL"
  | "LOW_RISK"
  | "SUSPICIOUS"
  | "THROTTLED"
  | "BLOCKED";

export type AbuseSignal = {
  name: string;
  current: number;
  threshold: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
};

export type AbuseEvent = {
  type: AbuseEventType;
  clerkId: string;
  dropId?: string;
  endpoint: string;
  timestamp: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type AbuseDecision = {
  classification: AbuseClassification;
  allowed: boolean;
  retryAfterSeconds?: number;
  reasons: string[];
  signals: AbuseSignal[];
  degraded?: boolean;
};

export type SignalSnapshot = {
  requestShort: number;
  requestMinute: number;
  actionRequests: number;
  duplicateDropJoins: number;
  duplicateQueueJoins: number;
  tokenFailures: number;
  crossParticipantTokens: number;
  crossDropTokens: number;
  invalidRequests: number;
  repeatedThrottled: number;
  rateLimitExceeded: number;
  bursts: number;
};

type RedisEvalClient = Pick<Redis, "eval">;

const REQUEST_SCRIPT = `
local function count(field)
  return tonumber(redis.call("HGET", KEYS[4], field) or "0")
end
local function response(state, shortCount, minuteCount, actionCount, retryAfter)
  return {state, shortCount, minuteCount, actionCount, retryAfter,
    count("duplicateDropJoins"), count("duplicateQueueJoins"), count("tokenFailures"),
    count("crossParticipantTokens"), count("crossDropTokens"), count("invalidRequests"),
    count("repeatedThrottled"), count("rateLimitExceeded"), count("bursts")}
end

if redis.call("EXISTS", KEYS[6]) == 1 then
  return response(2, 0, 0, 0, redis.call("TTL", KEYS[6]))
end

if redis.call("EXISTS", KEYS[5]) == 1 then
  local repeated = redis.call("HINCRBY", KEYS[4], "repeatedThrottled", 1)
  redis.call("EXPIRE", KEYS[4], ARGV[8])
  if repeated >= tonumber(ARGV[11]) then
    redis.call("SET", KEYS[6], "1", "EX", ARGV[10])
    return response(2, 0, 0, 0, tonumber(ARGV[10]))
  end
  return response(1, 0, 0, 0, redis.call("TTL", KEYS[5]))
end

local shortCount = redis.call("INCR", KEYS[1])
if shortCount == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local minuteCount = redis.call("INCR", KEYS[2])
if minuteCount == 1 then redis.call("EXPIRE", KEYS[2], ARGV[3]) end
local actionCount = redis.call("INCR", KEYS[3])
if actionCount == 1 then redis.call("EXPIRE", KEYS[3], ARGV[5]) end

if shortCount > tonumber(ARGV[2]) or minuteCount > tonumber(ARGV[4]) or actionCount > tonumber(ARGV[6]) then
  redis.call("HINCRBY", KEYS[4], "rateLimitExceeded", 1)
  if shortCount > tonumber(ARGV[2]) then redis.call("HINCRBY", KEYS[4], "bursts", 1) end
  redis.call("EXPIRE", KEYS[4], ARGV[8])
  redis.call("SET", KEYS[5], "1", "EX", ARGV[9])
  return response(1, shortCount, minuteCount, actionCount, tonumber(ARGV[9]))
end

return response(0, shortCount, minuteCount, actionCount, 0)
`;

const EVENT_SCRIPT = `
local function count(field)
  return tonumber(redis.call("HGET", KEYS[1], field) or "0")
end
local function response(state, current, retryAfter)
  return {state, current, retryAfter,
    count("duplicateDropJoins"), count("duplicateQueueJoins"), count("tokenFailures"),
    count("crossParticipantTokens"), count("crossDropTokens"), count("invalidRequests"),
    count("repeatedThrottled"), count("rateLimitExceeded"), count("bursts")}
end

if redis.call("EXISTS", KEYS[3]) == 1 then
  return response(2, 0, redis.call("TTL", KEYS[3]))
end

local current = redis.call("HINCRBY", KEYS[1], ARGV[1], 1)
redis.call("EXPIRE", KEYS[1], ARGV[2])

if current >= tonumber(ARGV[4]) then
  redis.call("SET", KEYS[3], "1", "EX", ARGV[6])
  return response(2, current, tonumber(ARGV[6]))
end
if current >= tonumber(ARGV[3]) then
  redis.call("SET", KEYS[2], "1", "EX", ARGV[5])
  return response(1, current, tonumber(ARGV[5]))
end
return response(0, current, 0)
`;

function numberAt(values: unknown[], index: number): number {
  const value = Number(values[index] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function signalsFromSnapshot(
  snapshot: SignalSnapshot,
  action: AbuseAction,
  actionLimit: number
): AbuseSignal[] {
  const signals: AbuseSignal[] = [];
  const duplicates = snapshot.duplicateDropJoins + snapshot.duplicateQueueJoins;
  const ownershipMismatches = snapshot.crossParticipantTokens + snapshot.crossDropTokens;

  if (snapshot.requestShort > ABUSE_POLICY.requestRate.shortLimit / 2) {
    signals.push({
      name: "REQUEST_BURST",
      current: snapshot.requestShort,
      threshold: ABUSE_POLICY.requestRate.shortLimit,
      severity: "MEDIUM",
      explanation: "Request volume is approaching or exceeding the short-window limit.",
    });
  }
  if (snapshot.requestMinute > ABUSE_POLICY.requestRate.minuteLimit / 2) {
    signals.push({
      name: "REQUEST_RATE",
      current: snapshot.requestMinute,
      threshold: ABUSE_POLICY.requestRate.minuteLimit,
      severity: "MEDIUM",
      explanation: "Request volume is approaching or exceeding the per-minute limit.",
    });
  }
  if (snapshot.actionRequests > Math.max(1, Math.floor(actionLimit / 2))) {
    signals.push({
      name: `${action}_RATE`,
      current: snapshot.actionRequests,
      threshold: actionLimit,
      severity: "LOW",
      explanation: "Repeated requests were observed for this endpoint action.",
    });
  }
  if (duplicates > 0) {
    signals.push({
      name: "DUPLICATE_JOIN_ATTEMPTS",
      current: duplicates,
      threshold: ABUSE_POLICY.events.duplicateJoin.suspicious,
      severity: duplicates >= ABUSE_POLICY.events.duplicateJoin.suspicious ? "MEDIUM" : "LOW",
      explanation: "Repeated idempotent drop or queue joins were observed.",
    });
  }
  if (snapshot.tokenFailures > 0) {
    signals.push({
      name: "INVALID_QUEUE_TOKENS",
      current: snapshot.tokenFailures,
      threshold: ABUSE_POLICY.events.tokenFailure.suspicious,
      severity: snapshot.tokenFailures >= ABUSE_POLICY.events.tokenFailure.suspicious ? "HIGH" : "LOW",
      explanation: "Queue-token verification failures were observed.",
    });
  }
  if (ownershipMismatches > 0) {
    signals.push({
      name: "TOKEN_OWNERSHIP_MISMATCH",
      current: ownershipMismatches,
      threshold: ABUSE_POLICY.events.ownershipMismatch.suspicious,
      severity: ownershipMismatches >= ABUSE_POLICY.events.ownershipMismatch.suspicious ? "HIGH" : "LOW",
      explanation: "Valid tokens were presented for another participant or drop.",
    });
  }
  if (snapshot.invalidRequests > 0) {
    signals.push({
      name: "INVALID_REQUESTS",
      current: snapshot.invalidRequests,
      threshold: ABUSE_POLICY.events.invalidRequest.suspicious,
      severity: snapshot.invalidRequests >= ABUSE_POLICY.events.invalidRequest.suspicious ? "MEDIUM" : "LOW",
      explanation: "Repeated malformed or invalid requests were observed.",
    });
  }
  if (snapshot.repeatedThrottled > 0) {
    signals.push({
      name: "REQUESTS_WHILE_THROTTLED",
      current: snapshot.repeatedThrottled,
      threshold: ABUSE_POLICY.events.repeatedThrottled.block,
      severity: "HIGH",
      explanation: "Requests continued while a temporary throttle was active.",
    });
  }
  return signals;
}

export function classifyAbuse(
  snapshot: SignalSnapshot,
  action: AbuseAction,
  enforcement: "NONE" | "THROTTLED" | "BLOCKED" = "NONE",
  retryAfterSeconds = 0
): AbuseDecision {
  const actionLimit = ABUSE_POLICY.actions[action].limit;
  const signals = signalsFromSnapshot(snapshot, action, actionLimit);

  if (enforcement === "BLOCKED") {
    return {
      classification: "BLOCKED",
      allowed: false,
      reasons: ["Temporary access block is active."],
      signals,
    };
  }
  if (enforcement === "THROTTLED") {
    return {
      classification: "THROTTLED",
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reasons: ["Request volume exceeded a configured temporary limit."],
      signals,
    };
  }

  const duplicateCount = snapshot.duplicateDropJoins + snapshot.duplicateQueueJoins;
  const ownershipCount = snapshot.crossParticipantTokens + snapshot.crossDropTokens;
  const suspicious =
    duplicateCount >= ABUSE_POLICY.events.duplicateJoin.suspicious ||
    snapshot.tokenFailures >= ABUSE_POLICY.events.tokenFailure.suspicious ||
    ownershipCount >= ABUSE_POLICY.events.ownershipMismatch.suspicious ||
    snapshot.invalidRequests >= ABUSE_POLICY.events.invalidRequest.suspicious ||
    signals.filter((signal) => signal.severity !== "LOW").length >= 2;

  return {
    classification: suspicious ? "SUSPICIOUS" : signals.length > 0 ? "LOW_RISK" : "NORMAL",
    allowed: true,
    reasons: signals.map((signal) => signal.explanation),
    signals,
  };
}

function requestSnapshot(values: unknown[]): SignalSnapshot {
  return {
    requestShort: numberAt(values, 1),
    requestMinute: numberAt(values, 2),
    actionRequests: numberAt(values, 3),
    duplicateDropJoins: numberAt(values, 5),
    duplicateQueueJoins: numberAt(values, 6),
    tokenFailures: numberAt(values, 7),
    crossParticipantTokens: numberAt(values, 8),
    crossDropTokens: numberAt(values, 9),
    invalidRequests: numberAt(values, 10),
    repeatedThrottled: numberAt(values, 11),
    rateLimitExceeded: numberAt(values, 12),
    bursts: numberAt(values, 13),
  };
}

function eventSnapshot(values: unknown[]): SignalSnapshot {
  return {
    requestShort: 0,
    requestMinute: 0,
    actionRequests: 0,
    duplicateDropJoins: numberAt(values, 3),
    duplicateQueueJoins: numberAt(values, 4),
    tokenFailures: numberAt(values, 5),
    crossParticipantTokens: numberAt(values, 6),
    crossDropTokens: numberAt(values, 7),
    invalidRequests: numberAt(values, 8),
    repeatedThrottled: numberAt(values, 9),
    rateLimitExceeded: numberAt(values, 10),
    bursts: numberAt(values, 11),
  };
}

function keys(clerkId: string, action: AbuseAction, dropId?: string) {
  const environment = getFairDropEnvironment();
  const scope = dropId ?? "global";
  return {
    short: `fairdrop:${environment}:ratelimit:user:${clerkId}:short`,
    minute: `fairdrop:${environment}:ratelimit:user:${clerkId}:minute`,
    action: `fairdrop:${environment}:ratelimit:${action.toLowerCase()}:${clerkId}:${scope}`,
    signals: `fairdrop:${environment}:abuse:user:${clerkId}:signals`,
    throttle: `fairdrop:${environment}:abuse:throttle:${clerkId}`,
    block: `fairdrop:${environment}:abuse:block:${clerkId}`,
  };
}

const EVENT_FIELD: Record<AbuseEventType, keyof SignalSnapshot> = {
  DUPLICATE_DROP_JOIN: "duplicateDropJoins",
  DUPLICATE_QUEUE_JOIN: "duplicateQueueJoins",
  INVALID_QUEUE_TOKEN: "tokenFailures",
  CROSS_PARTICIPANT_TOKEN: "crossParticipantTokens",
  CROSS_DROP_TOKEN: "crossDropTokens",
  INVALID_REQUEST: "invalidRequests",
};

function eventThresholds(event: AbuseEventType) {
  if (event === "DUPLICATE_DROP_JOIN" || event === "DUPLICATE_QUEUE_JOIN") {
    return ABUSE_POLICY.events.duplicateJoin;
  }
  if (event === "INVALID_QUEUE_TOKEN") return ABUSE_POLICY.events.tokenFailure;
  if (event === "CROSS_PARTICIPANT_TOKEN" || event === "CROSS_DROP_TOKEN") {
    return ABUSE_POLICY.events.ownershipMismatch;
  }
  return ABUSE_POLICY.events.invalidRequest;
}

function eventSeverity(event: AbuseEventType): AbuseEvent["severity"] {
  if (event === "CROSS_PARTICIPANT_TOKEN" || event === "CROSS_DROP_TOKEN") {
    return "HIGH";
  }
  if (event === "INVALID_QUEUE_TOKEN" || event === "INVALID_REQUEST") {
    return "MEDIUM";
  }
  return "LOW";
}

function logDecision(decision: AbuseDecision, event: string, endpoint: string) {
  if (decision.classification !== "NORMAL") {
    console.warn(
      `[FairDrop Abuse] classification=${decision.classification} event=${event} endpoint=${endpoint}`
    );
  }
}

function failOpen(): AbuseDecision {
  return {
    classification: "NORMAL",
    allowed: true,
    reasons: [],
    signals: [],
    degraded: true,
  };
}

export async function evaluateAbuseRequest(
  input: { clerkId: string; action: AbuseAction; endpoint: string; dropId?: string },
  redis: RedisEvalClient = getRedisClient()
): Promise<AbuseDecision> {
  const key = keys(input.clerkId, input.action, input.dropId);
  const actionPolicy = ABUSE_POLICY.actions[input.action];

  try {
    const values = await redis.eval<Array<string | number>, unknown[]>(
      REQUEST_SCRIPT,
      [key.short, key.minute, key.action, key.signals, key.throttle, key.block],
      [
        ABUSE_POLICY.requestRate.shortWindowSeconds,
        ABUSE_POLICY.requestRate.shortLimit,
        ABUSE_POLICY.requestRate.minuteWindowSeconds,
        ABUSE_POLICY.requestRate.minuteLimit,
        actionPolicy.windowSeconds,
        actionPolicy.limit,
        input.action,
        ABUSE_POLICY.signalTtlSeconds,
        ABUSE_POLICY.throttleSeconds,
        ABUSE_POLICY.blockSeconds,
        ABUSE_POLICY.events.repeatedThrottled.block,
      ]
    );
    const state = numberAt(values, 0);
    const decision = classifyAbuse(
      requestSnapshot(values),
      input.action,
      state === 2 ? "BLOCKED" : state === 1 ? "THROTTLED" : "NONE",
      numberAt(values, 4)
    );
    logDecision(decision, state === 0 ? "REQUEST" : "RATE_LIMIT_EXCEEDED", input.endpoint);
    return decision;
  } catch {
    console.error("[FairDrop Abuse] Redis unavailable; request allowed without abuse evaluation");
    return failOpen();
  }
}

export async function recordAbuseEvent(
  input: {
    clerkId: string;
    action: AbuseAction;
    event: AbuseEventType;
    endpoint: string;
    dropId?: string;
  },
  redis: RedisEvalClient = getRedisClient()
): Promise<AbuseDecision> {
  const key = keys(input.clerkId, input.action, input.dropId);
  const thresholds = eventThresholds(input.event);
  const event: AbuseEvent = {
    type: input.event,
    clerkId: input.clerkId,
    dropId: input.dropId,
    endpoint: input.endpoint,
    timestamp: new Date().toISOString(),
    severity: eventSeverity(input.event),
  };

  try {
    const values = await redis.eval<Array<string | number>, unknown[]>(
      EVENT_SCRIPT,
      [key.signals, key.throttle, key.block],
      [
        EVENT_FIELD[input.event],
        ABUSE_POLICY.signalTtlSeconds,
        thresholds.throttle,
        thresholds.block,
        ABUSE_POLICY.throttleSeconds,
        ABUSE_POLICY.blockSeconds,
      ]
    );
    const state = numberAt(values, 0);
    const decision = classifyAbuse(
      eventSnapshot(values),
      input.action,
      state === 2 ? "BLOCKED" : state === 1 ? "THROTTLED" : "NONE",
      numberAt(values, 2)
    );
    logDecision(decision, event.type, event.endpoint);
    return decision;
  } catch {
    console.error("[FairDrop Abuse] Redis unavailable; abuse event was not recorded");
    return failOpen();
  }
}
