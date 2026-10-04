export const MAX_VIRTUAL_USERS = 50_000;
export const MAX_CONCURRENCY = 500;
export const MAX_DURATION_SECONDS = 300;
export const MAX_REQUEST_RATE = 2_000;

export const SIMULATION_SCENARIOS = [
  "NORMAL_TRAFFIC",
  "REQUEST_FLOOD",
  "BOT_SWARM",
  "DUPLICATE_ATTEMPTS",
  "TOKEN_REPLAY",
  "QUEUE_MANIPULATION",
  "MIXED_ATTACK",
] as const;
export type SimulationScenario = (typeof SIMULATION_SCENARIOS)[number];
export type VirtualUserProfile = Exclude<SimulationScenario, "MIXED_ATTACK">;
export type SimulationRunStatus = "CREATED" | "STARTING" | "RUNNING" | "STOPPING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type SimulationAction = "DROP_JOIN" | "QUEUE_JOIN" | "QUEUE_STATUS" | "SESSION_RECOVERY" | "ALLOCATION_CLAIM" | "TOKEN_REPLAY";

export type SimulationConfig = {
  virtualUsers: number;
  durationSeconds: number;
  maxConcurrency: number;
  requestRate: number;
  scenario: SimulationScenario;
  seed?: number;
  burstSize?: number;
  jitterMs?: number;
  warmupSeconds?: number;
  attackDistribution?: Partial<Record<VirtualUserProfile, number>>;
};

export type ResolvedSimulationConfig = Required<Omit<SimulationConfig, "seed" | "attackDistribution">> & {
  seed: number;
  attackDistribution: Record<VirtualUserProfile, number>;
};

export type VirtualUser = { index: number; virtualUserId: string; clerkId: string; profile: VirtualUserProfile; seed: number };

export type SimulationMetrics = {
  totalVirtualUsers: number;
  activeVirtualUsers: number;
  completedVirtualUsers: number;
  execution: {
    configuredRequestRate: number;
    elapsedMs: number;
    workerLimit: number;
    activeWorkers: number;
    peakActiveWorkers: number;
    inFlightRequests: number;
    peakInFlightRequests: number;
    startedVirtualUsers: number;
    timedOutVirtualUsers: number;
    cancelledVirtualUsers: number;
    failedVirtualUsers: number;
    scheduledRequests: number;
    lateScheduleCount: number;
    scheduleDelayMs: number;
    actionLatency: Record<string, { count: number; totalMs: number; maxMs: number }>;
    serviceTiming: { abuseMs: number; fairDropServiceMs: number };
  };
  totalRequests: number;
  requestsPerSecond: number;
  requestsByEndpoint: Record<string, number>;
  requestsByProfile: Record<string, number>;
  responses: { success2xx: number; client4xx: number; throttled429: number; server5xx: number };
  latency: { averageMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number; sampleCount: number };
  abuse: { throttled: number; blocked: number; invalidTokenAttempts: number; duplicateAttempts: number; ownershipFailures: number };
  queue: { successfulJoins: number; duplicateJoins: number; failures: number; normalizedPositionSum: number; normalizedPositionCount: number; positionBuckets: number[] };
  allocation: { attempts: number; successful: number; rejected: number; duplicates: number };
  behaviorGroups: Record<string, { users: number; requests: number; queueSuccess: number; allocationSuccess: number }>;
  integrity: { uniqueSeats: number; duplicateSeatAssignments: number; duplicateParticipantAllocations: number; duplicateQueueEntries: number; overselling: number; seatsRemaining: number };
  errors: { timeouts: number; connection: number; unexpected: number };
};

export type SimulationResult = {
  simulationRunId: string;
  dropId: string;
  status: SimulationRunStatus;
  configuration: ResolvedSimulationConfig;
  startedAt: string;
  completedAt: string;
  metrics: SimulationMetrics;
  errorSummary: string | null;
};

export type SimulationActionResult = {
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  duplicate?: boolean;
  invalidToken?: boolean;
  ownershipFailure?: boolean;
  timeout?: boolean;
  connectionError?: boolean;
  timing?: { abuseMs: number; fairDropServiceMs: number };
  participantId?: string;
  seatId?: string;
  queuePosition?: number;
  queueSize?: number;
};
