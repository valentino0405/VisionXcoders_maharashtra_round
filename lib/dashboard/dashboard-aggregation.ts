import type { ExperimentComparison } from "@/lib/experiments/experiment-types.ts";
import type { SimulationMetrics } from "@/lib/simulator/simulator-types.ts";

type RunInput = { simulationRunId: string; status: string; scenario: string; configuration: Record<string, unknown>; metrics: SimulationMetrics } | null;
type ExperimentInput = { experimentId: string; name: string; status: string; scenario: string; configuration: Record<string, unknown>; baselineRunId: string; fairDropRunId: string; baselineMetrics?: SimulationMetrics | null; fairDropMetrics?: SimulationMetrics | null; comparison?: ExperimentComparison | null } | null;

export function aggregateDashboard(run: RunInput, experiment: ExperimentInput) {
  const metrics = experiment?.fairDropMetrics ?? run?.metrics ?? null;
  const users = Number(experiment?.configuration.virtualUsers ?? run?.configuration.virtualUsers ?? metrics?.totalVirtualUsers ?? 0);
  const queued = metrics?.queue.successfulJoins ?? 0;
  const allocated = metrics?.allocation.successful ?? 0;
  const attackUsers = metrics ? Object.entries(metrics.behaviorGroups ?? {}).filter(([profile]) => profile !== "NORMAL_TRAFFIC").reduce((sum, [, group]) => sum + group.users, 0) : 0;
  const suspiciousTrafficRate = users ? attackUsers / users : 0;
  const activeStatus = new Set(["CREATED", "STARTING", "RUNNING", "STOPPING", "RUNNING_BASELINE", "RUNNING_FAIRDROP", "COMPARING"]);
  const active = activeStatus.has(experiment?.status ?? run?.status ?? "");
  const comparison = experiment?.comparison ?? null;
  return {
    hasData: Boolean(run || experiment),
    active,
    operations: {
      activeVirtualUsers: metrics?.activeVirtualUsers ?? 0,
      queueDepth: Math.max(0, queued - allocated),
      requestsPerSecond: metrics?.requestsPerSecond ?? 0,
      seatsRemaining: Math.max(0, 500 - allocated),
      suspiciousTraffic: suspiciousTrafficRate,
      throttledRequests: metrics?.abuse.throttled ?? 0,
      blockedRequests: metrics?.abuse.blocked ?? 0,
      allocationRate: users ? allocated / users : 0,
      p95LatencyMs: metrics?.latency.p95Ms ?? 0,
      p99LatencyMs: metrics?.latency.p99Ms ?? 0,
    },
    fairness: {
      queuePositionDistribution: metrics?.queue.positionBuckets ?? Array(10).fill(0),
      normalizedQueuePosition: metrics?.queue.normalizedPositionCount ? metrics.queue.normalizedPositionSum / metrics.queue.normalizedPositionCount : null,
      allocationRateByBehavior: Object.fromEntries(Object.entries(metrics?.behaviorGroups ?? {}).map(([profile, group]) => [profile, group.users ? group.allocationSuccess / group.users : null])),
      normalVsAttackDifference: comparison?.fairness.normalVsAttackDifference.fairDrop ?? null,
      participationRate: users ? Math.min(1, (metrics?.requestsByEndpoint["/api/drop/join"] ?? 0) / users) : null,
      queueEntryRate: users ? queued / users : null,
      retryResilience: metrics ? metrics.queue.duplicateJoins === 0 ? 1 : Math.max(0, 1 - metrics.integrity.duplicateQueueEntries / metrics.queue.duplicateJoins) : null,
      throttleRate: metrics?.totalRequests ? metrics.abuse.throttled / metrics.totalRequests : null,
      blockRate: metrics?.totalRequests ? metrics.abuse.blocked / metrics.totalRequests : null,
    },
    latestExperiment: experiment ? {
      experimentId: experiment.experimentId, name: experiment.name, scenario: experiment.scenario, users,
      status: experiment.status, baselineRunId: experiment.baselineRunId, fairDropRunId: experiment.fairDropRunId,
      keyComparison: comparison ? { requests: comparison.traffic.totalRequests, p95: comparison.latency.p95Ms, allocations: comparison.allocation.successful, overselling: comparison.integrity.overselling } : null,
    } : null,
    latestRun: run ? { simulationRunId: run.simulationRunId, status: run.status, scenario: run.scenario } : null,
  };
}
