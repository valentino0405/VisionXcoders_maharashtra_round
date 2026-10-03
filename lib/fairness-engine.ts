/**
 * Read-only fairness measurement primitives. Callers must supply observations
 * assembled from trusted server-side outcomes; this module never accepts client
 * classifications and never mutates queue, abuse, or allocation state.
 */

export const BEHAVIOR_GROUPS = [
  "NORMAL",
  "LOW_RISK",
  "SUSPICIOUS",
  "THROTTLED",
  "BLOCKED",
] as const;

export type BehaviorGroup = (typeof BEHAVIOR_GROUPS)[number];
export type MetricAvailability = "AVAILABLE" | "UNAVAILABLE";
export type MetricReliability = "NOT_AVAILABLE" | "LOW" | "LIMITED" | "STANDARD";

export type QueueIdentity = {
  entryId: string;
  position: number;
  sequence: number;
  totalQueueSize: number;
};

export type InvalidTokenAttempts = {
  malformed?: number;
  expired?: number;
  signatureFailure?: number;
  ownershipMismatch?: number;
  dropMismatch?: number;
};

export type EnforcementObservation = {
  throttled?: boolean;
  blocked?: boolean;
  /** Requests per comparable measurement interval, collected before a throttle. */
  requestRateBeforeThrottle?: number;
  /** Requests per comparable measurement interval, collected while throttled. */
  requestRateDuringThrottle?: number;
  /** Requests per comparable measurement interval, collected before a block. */
  requestsBeforeBlock?: number;
  /** Requests per comparable measurement interval, collected while blocked. */
  requestsDuringBlock?: number;
  /** Requests per comparable measurement interval, collected after expiry. */
  requestsAfterBlockExpiration?: number;
};

/** One de-duplicated subject in a bounded experiment/drop measurement window. */
export type FairnessObservation = {
  subjectId: string;
  behaviorGroup: BehaviorGroup;
  joinAttempts: number;
  participationSucceeded: boolean;
  queueAttempts: number;
  queueEntered: boolean;
  /** Duplicate requests, counted separately from unique subjects. */
  duplicateAttempts?: number;
  tokenValidationAttempts?: number;
  invalidTokenAttempts?: InvalidTokenAttempts;
  queue?: QueueIdentity;
  /** First immutable queue outcome and outcomes returned by repeated valid requests. */
  retry?: {
    first: QueueIdentity;
    repeated: QueueIdentity[];
  };
  enforcement?: EnforcementObservation;
};

export type AllocationOutcome = {
  participantId: string;
  behaviorGroup: BehaviorGroup;
  eligible: boolean;
  allocated: boolean;
  seatId?: string;
  allocatedAt?: string;
};

export type RateMetric = {
  availability: MetricAvailability;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  sampleSize: number;
  reliability: MetricReliability;
  confidenceInterval95: { lower: number; upper: number; method: "WILSON" } | null;
  definition: string;
  formula: string;
  population: string;
  timeWindow: string;
  interpretation: string;
  limitation: string;
};

export type DistributionMetric = {
  availability: MetricAvailability;
  sampleSize: number;
  minimum: number | null;
  maximum: number | null;
  mean: number | null;
  median: number | null;
  p50: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  definition: string;
  formula: string;
  population: string;
  timeWindow: string;
  interpretation: string;
  limitation: string;
};

export type ImpactMetric = {
  availability: MetricAvailability;
  sampleSize: number;
  beforeMean: number | null;
  duringMean: number | null;
  afterMean: number | null;
  observedChangeDuring: number | null;
  definition: string;
  population: string;
  timeWindow: string;
  interpretation: string;
  limitation: string;
};

export type RetryResilienceMetric = {
  availability: MetricAvailability;
  sampleSize: number;
  repeatedRequestCount: number;
  unchangedIdentityRate: RateMetric;
  unchangedPositionRate: RateMetric;
  unchangedSequenceRate: RateMetric;
  improvedPositionCount: number;
  improvedSequenceCount: number;
  definition: string;
  population: string;
  timeWindow: string;
  interpretation: string;
  limitation: string;
};

export type InvalidTokenMetric = RateMetric & {
  breakdown: Record<keyof Required<InvalidTokenAttempts>, number>;
};

export type GroupSnapshot = {
  population: { totalUsers: number; participants: number; queued: number };
  queueAccessRate: RateMetric;
  throttleRate: RateMetric;
  blockRate: RateMetric;
  queuePositionDistribution: DistributionMetric;
  normalizedQueuePositionDistribution: DistributionMetric;
};

export type GroupComparison = {
  comparisonGroup: BehaviorGroup;
  referenceGroup: "NORMAL";
  metric: "QUEUE_ENTRY_RATE" | "MEDIAN_NORMALIZED_QUEUE_POSITION";
  availability: MetricAvailability;
  comparisonValue: number | null;
  referenceValue: number | null;
  difference: number | null;
  rateRatio: number | null;
  sampleSize: { comparison: number; reference: number };
  interpretation: string;
  limitation: string;
};

export type AllocationMetrics = {
  available: boolean;
  status: "NOT_AVAILABLE_UNTIL_PHASE_6" | "AVAILABLE";
  allocationRate: RateMetric | null;
  allocationRateByGroup: Partial<Record<BehaviorGroup, RateMetric>>;
  duplicateAllocationRate: RateMetric | null;
  oversellRate: RateMetric | null;
  seatDistribution: Record<BehaviorGroup, number> | null;
  limitation: string;
};

export type FairnessSnapshot = {
  experimentId: string;
  dropId: string;
  startedAt: string;
  endedAt: string;
  population: { totalUsers: number; participants: number; queued: number };
  groups: Record<BehaviorGroup, GroupSnapshot>;
  metrics: {
    participationRate: RateMetric;
    queueEntryRate: RateMetric;
    throttleRate: RateMetric;
    blockRate: RateMetric;
    duplicateAttemptRate: RateMetric;
    invalidTokenRate: InvalidTokenMetric;
    queuePositionDistribution: DistributionMetric;
    normalizedQueuePositionDistribution: DistributionMetric;
    retryResilience: RetryResilienceMetric;
    throttlingImpact: ImpactMetric;
    blockImpact: ImpactMetric;
    groupComparisons: GroupComparison[];
  };
  allocationMetrics: AllocationMetrics;
};

export class FairnessInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FairnessInputError";
  }
}

type SnapshotOptions = {
  experimentId: string;
  dropId: string;
  startedAt: string | Date;
  endedAt: string | Date;
  observations: FairnessObservation[];
  allocationOutcomes?: AllocationOutcome[];
  allocationCapacity?: number;
};

const INVALID_TOKEN_KEYS = [
  "malformed",
  "expired",
  "signatureFailure",
  "ownershipMismatch",
  "dropMismatch",
] as const;

function numberOrZero(value: number | undefined): number {
  return value ?? 0;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new FairnessInputError(`${label} must be a non-negative integer`);
  }
}

function assertNonNegativeFinite(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new FairnessInputError(`${label} must be a non-negative finite number`);
  }
}

function assertQueueIdentity(identity: QueueIdentity, label: string): void {
  if (!identity.entryId) throw new FairnessInputError(`${label}.entryId is required`);
  if (!Number.isInteger(identity.position) || identity.position < 1) {
    throw new FairnessInputError(`${label}.position must be a positive integer`);
  }
  if (!Number.isInteger(identity.sequence) || identity.sequence < 1) {
    throw new FairnessInputError(`${label}.sequence must be a positive integer`);
  }
  if (!Number.isInteger(identity.totalQueueSize) || identity.totalQueueSize < identity.position) {
    throw new FairnessInputError(`${label}.totalQueueSize must be an integer no smaller than position`);
  }
}

function validateObservation(observation: FairnessObservation): void {
  if (!observation.subjectId) throw new FairnessInputError("subjectId is required");
  if (!BEHAVIOR_GROUPS.includes(observation.behaviorGroup)) {
    throw new FairnessInputError("behaviorGroup must be a supported Phase 4 classification");
  }
  assertNonNegativeInteger(observation.joinAttempts, "joinAttempts");
  assertNonNegativeInteger(observation.queueAttempts, "queueAttempts");
  assertNonNegativeInteger(numberOrZero(observation.duplicateAttempts), "duplicateAttempts");
  assertNonNegativeInteger(numberOrZero(observation.tokenValidationAttempts), "tokenValidationAttempts");

  if (observation.participationSucceeded && observation.joinAttempts === 0) {
    throw new FairnessInputError("a successful participant must have at least one join attempt");
  }
  if (observation.queueEntered && (!observation.participationSucceeded || observation.queueAttempts === 0)) {
    throw new FairnessInputError("a queue entry requires successful participation and a queue attempt");
  }
  if (numberOrZero(observation.duplicateAttempts) > observation.joinAttempts + observation.queueAttempts) {
    throw new FairnessInputError("duplicateAttempts cannot exceed total relevant attempts");
  }

  let invalidTotal = 0;
  for (const key of INVALID_TOKEN_KEYS) {
    const value = numberOrZero(observation.invalidTokenAttempts?.[key]);
    assertNonNegativeInteger(value, `invalidTokenAttempts.${key}`);
    invalidTotal += value;
  }
  if (invalidTotal > numberOrZero(observation.tokenValidationAttempts)) {
    throw new FairnessInputError("invalid token attempts cannot exceed token validation attempts");
  }

  if (observation.queue) {
    if (!observation.queueEntered) throw new FairnessInputError("queue details require queueEntered");
    assertQueueIdentity(observation.queue, "queue");
  }
  if (observation.retry) {
    assertQueueIdentity(observation.retry.first, "retry.first");
    observation.retry.repeated.forEach((identity, index) =>
      assertQueueIdentity(identity, `retry.repeated[${index}]`)
    );
  }

  const enforcement = observation.enforcement;
  if (enforcement) {
    assertNonNegativeFinite(enforcement.requestRateBeforeThrottle, "requestRateBeforeThrottle");
    assertNonNegativeFinite(enforcement.requestRateDuringThrottle, "requestRateDuringThrottle");
    assertNonNegativeFinite(enforcement.requestsBeforeBlock, "requestsBeforeBlock");
    assertNonNegativeFinite(enforcement.requestsDuringBlock, "requestsDuringBlock");
    assertNonNegativeFinite(enforcement.requestsAfterBlockExpiration, "requestsAfterBlockExpiration");
  }
}

function reliability(denominator: number): MetricReliability {
  if (denominator === 0) return "NOT_AVAILABLE";
  if (denominator < 10) return "LOW";
  if (denominator < 30) return "LIMITED";
  return "STANDARD";
}

function wilsonInterval(successes: number, total: number): { lower: number; upper: number; method: "WILSON" } {
  const z = 1.959963984540054;
  const proportion = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = proportion + (z * z) / (2 * total);
  const margin = z * Math.sqrt((proportion * (1 - proportion) + (z * z) / (4 * total)) / total);
  return { lower: (centre - margin) / denominator, upper: (centre + margin) / denominator, method: "WILSON" };
}

function rateMetric(
  numerator: number,
  denominator: number,
  details: Pick<RateMetric, "definition" | "formula" | "population" | "timeWindow" | "interpretation" | "limitation">
): RateMetric {
  if (denominator === 0) {
    return {
      availability: "UNAVAILABLE", value: null, numerator, denominator, sampleSize: 0,
      reliability: "NOT_AVAILABLE", confidenceInterval95: null, ...details,
    };
  }
  return {
    availability: "AVAILABLE", value: numerator / denominator, numerator, denominator, sampleSize: denominator,
    reliability: reliability(denominator), confidenceInterval95: wilsonInterval(numerator, denominator), ...details,
  };
}

function distributionMetric(
  values: number[],
  label: string,
  timeWindow: string,
  normalized = false
): DistributionMetric {
  const common = {
    definition: `${normalized ? "Normalized " : ""}${label} distribution among successfully queued users.`,
    formula: normalized ? "normalized position = position / queue size at entry" : "linear-interpolated percentile over ascending queue positions",
    population: "Successfully queued users with valid queue state.", timeWindow,
    interpretation: normalized
      ? "Lower values indicate earlier positions relative to that user's queue size."
      : "Describes observed queue placement; it does not by itself establish fairness.",
    limitation: "Only observed successful queue entries are included; request behavior and enforcement context still matter.",
  };
  if (values.length === 0) {
    return { availability: "UNAVAILABLE", sampleSize: 0, minimum: null, maximum: null, mean: null, median: null, p50: null, p90: null, p95: null, p99: null, ...common };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (percent: number) => {
    const index = (sorted.length - 1) * percent;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  return {
    availability: "AVAILABLE", sampleSize: sorted.length, minimum: sorted[0], maximum: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length, median: percentile(0.5),
    p50: percentile(0.5), p90: percentile(0.9), p95: percentile(0.95), p99: percentile(0.99), ...common,
  };
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function impactMetric(
  before: number[],
  during: number[],
  after: number[],
  population: string,
  timeWindow: string,
  definition: string
): ImpactMetric {
  const beforeMean = mean(before);
  const duringMean = mean(during);
  const afterMean = mean(after);
  const available = beforeMean !== null && duringMean !== null;
  return {
    availability: available ? "AVAILABLE" : "UNAVAILABLE", sampleSize: Math.min(before.length, during.length),
    beforeMean, duringMean, afterMean,
    observedChangeDuring: available ? duringMean - beforeMean : null,
    definition, population, timeWindow,
    interpretation: "Reports an observed change across comparable intervals; it does not establish that enforcement caused the change.",
    limitation: "Comparable observation intervals and a suitable experiment design are required for causal conclusions.",
  };
}

function emptyGroup(observations: FairnessObservation[], group: BehaviorGroup, timeWindow: string): GroupSnapshot {
  const groupUsers = observations.filter((observation) => observation.behaviorGroup === group);
  const participants = groupUsers.filter((observation) => observation.participationSucceeded);
  const queued = groupUsers.filter((observation) => observation.queueEntered);
  const positions = queued.flatMap((observation) => observation.queue ? [observation.queue.position] : []);
  const normalized = queued.flatMap((observation) => observation.queue ? [observation.queue.position / observation.queue.totalQueueSize] : []);
  return {
    population: { totalUsers: groupUsers.length, participants: participants.length, queued: queued.length },
    queueAccessRate: rateMetric(queued.length, participants.length, {
      definition: "Successful queue entries divided by successful drop participants in this behavior group.", formula: "queued / participants",
      population: `${group} successful drop participants.`, timeWindow,
      interpretation: "Describes the share of measured participants in this group that entered the queue.",
      limitation: "Differences between behavior groups are descriptive and can reflect enforcement or request patterns.",
    }),
    throttleRate: rateMetric(groupUsers.filter((observation) => observation.enforcement?.throttled).length, groupUsers.length, {
      definition: "Users that experienced temporary throttling divided by measured users in this behavior group.", formula: "throttled users / measured users",
      population: `${group} measured users.`, timeWindow,
      interpretation: "Distinguishes enforcement experience from the user's behavioral classification.",
      limitation: "It does not measure legitimacy or fairness of an individual enforcement decision.",
    }),
    blockRate: rateMetric(groupUsers.filter((observation) => observation.enforcement?.blocked).length, groupUsers.length, {
      definition: "Users that experienced a temporary block divided by measured users in this behavior group.", formula: "blocked users / measured users",
      population: `${group} measured users.`, timeWindow,
      interpretation: "Describes observed block exposure in the measured window.",
      limitation: "It does not prove whether blocks were correct or proportionate.",
    }),
    queuePositionDistribution: distributionMetric(positions, "queue position", timeWindow),
    normalizedQueuePositionDistribution: distributionMetric(normalized, "queue position", timeWindow, true),
  };
}

function retryMetric(observations: FairnessObservation[], timeWindow: string): RetryResilienceMetric {
  const repeated = observations.flatMap((observation) =>
    observation.retry?.repeated.map((identity) => ({ first: observation.retry!.first, repeated: identity })) ?? []
  );
  const details = {
    definition: "Compares the first valid queue outcome with every repeated valid queue request.",
    population: "Repeated valid queue requests with a recorded first valid queue outcome.", timeWindow,
    interpretation: "A resilient idempotent queue keeps entry identity, position, and sequence unchanged; repeated requests must not improve placement.",
    limitation: "Only retries captured in the measurement input are evaluated.",
  };
  const unchangedIdentity = repeated.filter((item) => item.first.entryId === item.repeated.entryId).length;
  const unchangedPosition = repeated.filter((item) => item.first.position === item.repeated.position).length;
  const unchangedSequence = repeated.filter((item) => item.first.sequence === item.repeated.sequence).length;
  return {
    availability: repeated.length ? "AVAILABLE" : "UNAVAILABLE", sampleSize: repeated.length, repeatedRequestCount: repeated.length,
    unchangedIdentityRate: rateMetric(unchangedIdentity, repeated.length, { ...details, formula: "unchanged entry identities / repeated valid queue requests" }),
    unchangedPositionRate: rateMetric(unchangedPosition, repeated.length, { ...details, formula: "unchanged positions / repeated valid queue requests" }),
    unchangedSequenceRate: rateMetric(unchangedSequence, repeated.length, { ...details, formula: "unchanged sequences / repeated valid queue requests" }),
    improvedPositionCount: repeated.filter((item) => item.repeated.position < item.first.position).length,
    improvedSequenceCount: repeated.filter((item) => item.repeated.sequence < item.first.sequence).length,
    ...details,
  };
}

export function calculateAllocationMetrics(
  allocationOutcomes?: AllocationOutcome[],
  capacity?: number,
  timeWindow = "Not available until Phase 6"
): AllocationMetrics {
  if (!allocationOutcomes) {
    return {
      available: false, status: "NOT_AVAILABLE_UNTIL_PHASE_6", allocationRate: null, allocationRateByGroup: {},
      duplicateAllocationRate: null, oversellRate: null, seatDistribution: null,
      limitation: "Phase 5 does not allocate seats or fabricate allocation outcomes.",
    };
  }
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 0)) {
    throw new FairnessInputError("allocationCapacity must be a non-negative integer");
  }
  const allocated = allocationOutcomes.filter((outcome) => outcome.allocated);
  const eligible = allocationOutcomes.filter((outcome) => outcome.eligible);
  const shared = {
    definition: "Allocated eligible users divided by eligible users.", formula: "allocated eligible users / eligible users",
    population: "Phase 6 allocation outcomes.", timeWindow,
    interpretation: "Describes observed allocation reach; it is not a universal fairness judgment.",
    limitation: "Valid only after a Phase 6 allocation service supplies trusted outcomes.",
  };
  const allocationRateByGroup: Partial<Record<BehaviorGroup, RateMetric>> = {};
  const seatDistribution: Record<BehaviorGroup, number> = { NORMAL: 0, LOW_RISK: 0, SUSPICIOUS: 0, THROTTLED: 0, BLOCKED: 0 };
  for (const group of BEHAVIOR_GROUPS) {
    const groupEligible = eligible.filter((outcome) => outcome.behaviorGroup === group);
    const groupAllocated = allocated.filter((outcome) => outcome.behaviorGroup === group && outcome.eligible);
    allocationRateByGroup[group] = rateMetric(groupAllocated.length, groupEligible.length, { ...shared, population: `${group} eligible users.` });
    seatDistribution[group] = allocated.filter((outcome) => outcome.behaviorGroup === group).length;
  }
  const seatIds = allocated.flatMap((outcome) => outcome.seatId ? [outcome.seatId] : []);
  const duplicateAllocations = seatIds.length - new Set(seatIds).size;
  const capacityKnown = capacity !== undefined;
  const oversold = capacityKnown ? Math.max(0, allocated.length - capacity) : 0;
  return {
    available: true, status: "AVAILABLE", allocationRate: rateMetric(allocated.filter((outcome) => outcome.eligible).length, eligible.length, shared),
    allocationRateByGroup,
    duplicateAllocationRate: rateMetric(duplicateAllocations, allocated.length, {
      ...shared, definition: "Repeated seat IDs among allocations divided by all allocations.", formula: "duplicate seat assignments / allocations",
    }),
    oversellRate: capacityKnown ? rateMetric(oversold, capacity!, {
      ...shared, definition: "Allocations beyond capacity divided by capacity.", formula: "max(allocations - capacity, 0) / capacity",
    }) : null,
    seatDistribution,
    limitation: "Allocation values are only available when trusted Phase 6 outcomes are provided; Phase 5 does not create them.",
  };
}

export function createFairnessSnapshot(options: SnapshotOptions): FairnessSnapshot {
  if (!options.experimentId || !options.dropId) throw new FairnessInputError("experimentId and dropId are required");
  const startedAt = new Date(options.startedAt);
  const endedAt = new Date(options.endedAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt < startedAt) {
    throw new FairnessInputError("startedAt and endedAt must be valid chronological timestamps");
  }
  const seen = new Set<string>();
  for (const observation of options.observations) {
    validateObservation(observation);
    if (seen.has(observation.subjectId)) throw new FairnessInputError("observations must contain one record per subjectId");
    seen.add(observation.subjectId);
  }
  const timeWindow = `${startedAt.toISOString()} to ${endedAt.toISOString()}`;
  const participants = options.observations.filter((observation) => observation.participationSucceeded);
  const queued = options.observations.filter((observation) => observation.queueEntered);
  const joinAttempts = options.observations.reduce((total, observation) => total + observation.joinAttempts, 0);
  const relevantAttempts = options.observations.reduce((total, observation) => total + observation.joinAttempts + observation.queueAttempts, 0);
  const duplicateAttempts = options.observations.reduce((total, observation) => total + numberOrZero(observation.duplicateAttempts), 0);
  const tokenValidations = options.observations.reduce((total, observation) => total + numberOrZero(observation.tokenValidationAttempts), 0);
  const tokenBreakdown = Object.fromEntries(INVALID_TOKEN_KEYS.map((key) => [key, options.observations.reduce((total, observation) => total + numberOrZero(observation.invalidTokenAttempts?.[key]), 0)])) as Record<keyof Required<InvalidTokenAttempts>, number>;
  const invalidTokenAttempts = Object.values(tokenBreakdown).reduce((total, value) => total + value, 0);
  const positions = queued.flatMap((observation) => observation.queue ? [observation.queue.position] : []);
  const normalizedPositions = queued.flatMap((observation) => observation.queue ? [observation.queue.position / observation.queue.totalQueueSize] : []);
  const throttleBefore = options.observations.flatMap((observation) => observation.enforcement?.requestRateBeforeThrottle === undefined ? [] : [observation.enforcement.requestRateBeforeThrottle]);
  const throttleDuring = options.observations.flatMap((observation) => observation.enforcement?.requestRateDuringThrottle === undefined ? [] : [observation.enforcement.requestRateDuringThrottle]);
  const blockBefore = options.observations.flatMap((observation) => observation.enforcement?.requestsBeforeBlock === undefined ? [] : [observation.enforcement.requestsBeforeBlock]);
  const blockDuring = options.observations.flatMap((observation) => observation.enforcement?.requestsDuringBlock === undefined ? [] : [observation.enforcement.requestsDuringBlock]);
  const blockAfter = options.observations.flatMap((observation) => observation.enforcement?.requestsAfterBlockExpiration === undefined ? [] : [observation.enforcement.requestsAfterBlockExpiration]);
  const groups = Object.fromEntries(BEHAVIOR_GROUPS.map((group) => [group, emptyGroup(options.observations, group, timeWindow)])) as Record<BehaviorGroup, GroupSnapshot>;
  const participationRate = rateMetric(participants.length, joinAttempts, {
    definition: "Successful drop participants divided by join attempts.", formula: "successful participants / join attempts",
    population: "All recorded drop join attempts.", timeWindow,
    interpretation: "Describes completion of join requests in the measurement window.",
    limitation: "Attempts, not unique users, are the denominator; retries can change the rate.",
  });
  const queueEntryRate = rateMetric(queued.length, participants.length, {
    definition: "Successful queue entries divided by successful drop participants.", formula: "queued participants / successful participants",
    population: "Successful drop participants.", timeWindow,
    interpretation: "Describes queue access after participation.",
    limitation: "It does not determine whether an observed group difference is fair or unfair.",
  });
  const groupsComparisons: GroupComparison[] = BEHAVIOR_GROUPS.filter((group) => group !== "NORMAL").flatMap((group) => {
    const compared = groups[group];
    const normal = groups.NORMAL;
    const queueRateAvailable = compared.queueAccessRate.value !== null && normal.queueAccessRate.value !== null;
    const positionAvailable = compared.normalizedQueuePositionDistribution.median !== null && normal.normalizedQueuePositionDistribution.median !== null;
    const shared = { comparisonGroup: group, referenceGroup: "NORMAL" as const, interpretation: "A difference is descriptive. Behavioral groups have different request and enforcement histories.", limitation: "Do not infer a universal fairness judgment from this comparison alone." };
    return [
      { ...shared, metric: "QUEUE_ENTRY_RATE" as const, availability: queueRateAvailable ? "AVAILABLE" as const : "UNAVAILABLE" as const,
        comparisonValue: compared.queueAccessRate.value, referenceValue: normal.queueAccessRate.value,
        difference: queueRateAvailable ? compared.queueAccessRate.value! - normal.queueAccessRate.value! : null,
        rateRatio: queueRateAvailable && normal.queueAccessRate.value !== 0 ? compared.queueAccessRate.value! / normal.queueAccessRate.value! : null,
        sampleSize: { comparison: compared.queueAccessRate.sampleSize, reference: normal.queueAccessRate.sampleSize } },
      { ...shared, metric: "MEDIAN_NORMALIZED_QUEUE_POSITION" as const, availability: positionAvailable ? "AVAILABLE" as const : "UNAVAILABLE" as const,
        comparisonValue: compared.normalizedQueuePositionDistribution.median, referenceValue: normal.normalizedQueuePositionDistribution.median,
        difference: positionAvailable ? compared.normalizedQueuePositionDistribution.median! - normal.normalizedQueuePositionDistribution.median! : null,
        rateRatio: positionAvailable && normal.normalizedQueuePositionDistribution.median !== 0 ? compared.normalizedQueuePositionDistribution.median! / normal.normalizedQueuePositionDistribution.median! : null,
        sampleSize: { comparison: compared.normalizedQueuePositionDistribution.sampleSize, reference: normal.normalizedQueuePositionDistribution.sampleSize } },
    ];
  });
  return {
    experimentId: options.experimentId, dropId: options.dropId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
    population: { totalUsers: options.observations.length, participants: participants.length, queued: queued.length }, groups,
    metrics: {
      participationRate, queueEntryRate,
      throttleRate: rateMetric(options.observations.filter((observation) => observation.enforcement?.throttled).length, options.observations.length, {
        definition: "Users that experienced temporary throttling divided by all measured users.", formula: "throttled users / measured users", population: "All measured users.", timeWindow,
        interpretation: "Describes enforcement exposure, separately from behavior classification.", limitation: "It does not assess the correctness of individual enforcement decisions.",
      }),
      blockRate: rateMetric(options.observations.filter((observation) => observation.enforcement?.blocked).length, options.observations.length, {
        definition: "Users that experienced a temporary block divided by all measured users.", formula: "blocked users / measured users", population: "All measured users.", timeWindow,
        interpretation: "Describes observed temporary block exposure.", limitation: "It does not establish whether blocks were justified.",
      }),
      duplicateAttemptRate: rateMetric(duplicateAttempts, relevantAttempts, {
        definition: "Duplicate join or queue attempts divided by all relevant attempts.", formula: "duplicate attempts / (join attempts + queue attempts)", population: "All recorded join and queue attempts.", timeWindow,
        interpretation: "Counts repeated requests, not unique users.", limitation: "A user can contribute multiple attempts, so it is not a user-level prevalence rate.",
      }),
      invalidTokenRate: { ...rateMetric(invalidTokenAttempts, tokenValidations, {
        definition: "Invalid queue-token validations divided by all queue-token validations.", formula: "invalid token attempts / token validation attempts", population: "All recorded queue-token validation attempts.", timeWindow,
        interpretation: "Describes invalid token traffic in the measurement window.", limitation: "Breakdowns indicate observed failure categories, not user intent.",
      }), breakdown: tokenBreakdown },
      queuePositionDistribution: distributionMetric(positions, "queue position", timeWindow),
      normalizedQueuePositionDistribution: distributionMetric(normalizedPositions, "queue position", timeWindow, true),
      retryResilience: retryMetric(options.observations, timeWindow),
      throttlingImpact: impactMetric(throttleBefore, throttleDuring, [], "Users with comparable request-rate observations before and during throttling.", timeWindow, "Mean request rate before and during a temporary throttle."),
      blockImpact: impactMetric(blockBefore, blockDuring, blockAfter, "Users with comparable request counts before, during, and after a temporary block.", timeWindow, "Mean request counts before, during, and after a temporary block."),
      groupComparisons: groupsComparisons,
    },
    allocationMetrics: calculateAllocationMetrics(options.allocationOutcomes, options.allocationCapacity, timeWindow),
  };
}
