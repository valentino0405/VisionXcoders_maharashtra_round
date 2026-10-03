export const ABUSE_POLICY = {
  requestRate: {
    shortWindowSeconds: 10,
    shortLimit: 20,
    minuteWindowSeconds: 60,
    minuteLimit: 60,
  },
  actions: {
    DROP_JOIN: { windowSeconds: 60, limit: 5 },
    QUEUE_JOIN: { windowSeconds: 60, limit: 5 },
    QUEUE_STATUS: { windowSeconds: 60, limit: 60 },
    ALLOCATION_CLAIM: { windowSeconds: 60, limit: 5 },
    SESSION_RECOVERY: { windowSeconds: 60, limit: 60 },
  },
  events: {
    duplicateJoin: { suspicious: 4, throttle: 10, block: 25 },
    tokenFailure: { suspicious: 3, throttle: 10, block: 20 },
    ownershipMismatch: { suspicious: 2, throttle: 6, block: 12 },
    invalidRequest: { suspicious: 4, throttle: 10, block: 20 },
    repeatedThrottled: { block: 5 },
  },
  throttleSeconds: 30,
  blockSeconds: 300,
  signalTtlSeconds: 300,
} as const;

export type AbuseAction = keyof typeof ABUSE_POLICY.actions;

export type AbuseEventType =
  | "DUPLICATE_DROP_JOIN"
  | "DUPLICATE_QUEUE_JOIN"
  | "INVALID_QUEUE_TOKEN"
  | "CROSS_PARTICIPANT_TOKEN"
  | "CROSS_DROP_TOKEN"
  | "INVALID_REQUEST";
