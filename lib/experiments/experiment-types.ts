import type { RateMetric } from "@/lib/fairness-engine";
import type { ResolvedSimulationConfig, SimulationMetrics, SimulationScenario } from "@/lib/simulator/simulator-types.ts";

export type ExperimentStatus = "CREATED" | "RUNNING_BASELINE" | "RUNNING_FAIRDROP" | "COMPARING" | "COMPLETED" | "FAILED" | "CANCELLED";
export function isTerminalExperimentStatus(status: string) { return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED"; }
export type ComparableValue = number | "NOT_APPLICABLE";
export type ComparisonValue = { baseline: ComparableValue; fairDrop: ComparableValue; difference: number | "NOT_APPLICABLE"; percentageDifference: number | "NOT_APPLICABLE" };
export type ExperimentConfig = Omit<ResolvedSimulationConfig, "scenario"> & { name: string; scenario: SimulationScenario };

export type BehaviorComparison = {
  users: ComparisonValue;
  requests: ComparisonValue;
  queueSuccess: ComparisonValue;
  allocationSuccess: ComparisonValue;
  allocationRate: ComparisonValue;
};

export type ExperimentComparison = {
  traffic: { totalRequests: ComparisonValue; requestsPerSecond: ComparisonValue; requestsByEndpoint: Record<string, ComparisonValue>; requestsByProfile: Record<string, ComparisonValue> };
  responses: Record<"success2xx" | "client4xx" | "throttled429" | "server5xx", ComparisonValue>;
  latency: Record<"averageMs" | "p50Ms" | "p95Ms" | "p99Ms" | "maxMs", ComparisonValue>;
  errors: Record<"timeouts" | "connection" | "unexpected", ComparisonValue>;
  queue: { successfulJoins: ComparisonValue; duplicateJoins: ComparisonValue; failures: ComparisonValue; normalizedPositionMean: ComparisonValue };
  abuse: Record<"throttled" | "blocked" | "invalidTokenAttempts" | "duplicateAttempts" | "ownershipFailures", ComparisonValue>;
  allocation: Record<"attempts" | "successful" | "rejected" | "duplicates", ComparisonValue> & { normalAllocationRate: ComparisonValue; attackAllocationRate: ComparisonValue };
  integrity: Record<"uniqueSeats" | "duplicateSeatAssignments" | "duplicateParticipantAllocations" | "duplicateQueueEntries" | "overselling" | "seatsRemaining", ComparisonValue>;
  behaviorGroups: Record<string, BehaviorComparison>;
  fairness: { baselineNormalRate: RateMetric; baselineAttackRate: RateMetric; fairDropNormalRate: RateMetric; fairDropAttackRate: RateMetric; normalVsAttackDifference: ComparisonValue };
};

export type ExperimentResult = {
  experimentId: string;
  name: string;
  scenario: SimulationScenario;
  configuration: ExperimentConfig;
  seed: number;
  baselineRunId: string;
  fairDropRunId: string;
  status: ExperimentStatus;
  startedAt: string | null;
  completedAt: string | null;
  baselineMetrics: SimulationMetrics | null;
  fairDropMetrics: SimulationMetrics | null;
  comparison: ExperimentComparison | null;
  error: string | null;
};
