import { rateMetric } from "../fairness-engine.ts";
import type { SimulationMetrics } from "../simulator/simulator-types.ts";
import type { ComparableValue, ComparisonValue, ExperimentComparison } from "./experiment-types.ts";

export function compareValues(baseline: ComparableValue, fairDrop: ComparableValue): ComparisonValue {
  if (baseline === "NOT_APPLICABLE" || fairDrop === "NOT_APPLICABLE") return { baseline, fairDrop, difference: "NOT_APPLICABLE", percentageDifference: "NOT_APPLICABLE" };
  const difference = fairDrop - baseline;
  return { baseline, fairDrop, difference, percentageDifference: baseline === 0 ? "NOT_APPLICABLE" : (difference / baseline) * 100 };
}

const numberMap = (left: Record<string, number>, right: Record<string, number>) => Object.fromEntries(new Set([...Object.keys(left), ...Object.keys(right)]).values().map((key) => [key, compareValues(left[key] ?? 0, right[key] ?? 0)]));
const normalizedMean = (metrics: SimulationMetrics) => metrics.queue.normalizedPositionCount ? metrics.queue.normalizedPositionSum / metrics.queue.normalizedPositionCount : 0;
const attackTotals = (metrics: SimulationMetrics) => Object.entries(metrics.behaviorGroups).filter(([key]) => key !== "NORMAL_TRAFFIC").reduce((sum, [, group]) => ({ users: sum.users + group.users, allocations: sum.allocations + group.allocationSuccess }), { users: 0, allocations: 0 });
const rate = (success: number, users: number, population: string) => rateMetric(success, users, { definition: "Observed allocations divided by observed virtual users.", formula: "allocations / virtual users", population, timeWindow: "Experiment run", interpretation: "Observed allocation reach for this workload group.", limitation: "Descriptive for this deterministic workload; not a universal causal estimate." });

export function compareExperimentMetrics(baseline: SimulationMetrics, fairDrop: SimulationMetrics): ExperimentComparison {
  const profiles = new Set([...Object.keys(baseline.behaviorGroups), ...Object.keys(fairDrop.behaviorGroups)]);
  const groups = Object.fromEntries([...profiles].map((profile) => {
    const b = baseline.behaviorGroups[profile] ?? { users: 0, requests: 0, queueSuccess: 0, allocationSuccess: 0 };
    const f = fairDrop.behaviorGroups[profile] ?? { users: 0, requests: 0, queueSuccess: 0, allocationSuccess: 0 };
    return [profile, { users: compareValues(b.users, f.users), requests: compareValues(b.requests, f.requests), queueSuccess: compareValues(b.queueSuccess, f.queueSuccess), allocationSuccess: compareValues(b.allocationSuccess, f.allocationSuccess), allocationRate: compareValues(b.users ? b.allocationSuccess / b.users : 0, f.users ? f.allocationSuccess / f.users : 0) }];
  }));
  const bn = baseline.behaviorGroups.NORMAL_TRAFFIC ?? { users: 0, allocationSuccess: 0 };
  const fn = fairDrop.behaviorGroups.NORMAL_TRAFFIC ?? { users: 0, allocationSuccess: 0 };
  const ba = attackTotals(baseline); const fa = attackTotals(fairDrop);
  const baselineNormalRate = rate(bn.allocationSuccess, bn.users, "Baseline normal virtual users");
  const baselineAttackRate = rate(ba.allocations, ba.users, "Baseline attack-profile virtual users");
  const fairDropNormalRate = rate(fn.allocationSuccess, fn.users, "FairDrop normal virtual users");
  const fairDropAttackRate = rate(fa.allocations, fa.users, "FairDrop attack-profile virtual users");
  return {
    traffic: { totalRequests: compareValues(baseline.totalRequests, fairDrop.totalRequests), requestsPerSecond: compareValues(baseline.requestsPerSecond, fairDrop.requestsPerSecond), requestsByEndpoint: numberMap(baseline.requestsByEndpoint, fairDrop.requestsByEndpoint), requestsByProfile: numberMap(baseline.requestsByProfile, fairDrop.requestsByProfile) },
    responses: { success2xx: compareValues(baseline.responses.success2xx, fairDrop.responses.success2xx), client4xx: compareValues(baseline.responses.client4xx, fairDrop.responses.client4xx), throttled429: compareValues("NOT_APPLICABLE", fairDrop.responses.throttled429), server5xx: compareValues(baseline.responses.server5xx, fairDrop.responses.server5xx) },
    latency: { averageMs: compareValues(baseline.latency.averageMs, fairDrop.latency.averageMs), p50Ms: compareValues(baseline.latency.p50Ms, fairDrop.latency.p50Ms), p95Ms: compareValues(baseline.latency.p95Ms, fairDrop.latency.p95Ms), p99Ms: compareValues(baseline.latency.p99Ms, fairDrop.latency.p99Ms), maxMs: compareValues(baseline.latency.maxMs, fairDrop.latency.maxMs) },
    errors: { timeouts: compareValues(baseline.errors.timeouts, fairDrop.errors.timeouts), connection: compareValues(baseline.errors.connection, fairDrop.errors.connection), unexpected: compareValues(baseline.errors.unexpected, fairDrop.errors.unexpected) },
    queue: { successfulJoins: compareValues(baseline.queue.successfulJoins, fairDrop.queue.successfulJoins), duplicateJoins: compareValues(baseline.queue.duplicateJoins, fairDrop.queue.duplicateJoins), failures: compareValues(baseline.queue.failures, fairDrop.queue.failures), normalizedPositionMean: compareValues(normalizedMean(baseline), normalizedMean(fairDrop)) },
    abuse: { throttled: compareValues("NOT_APPLICABLE", fairDrop.abuse.throttled), blocked: compareValues("NOT_APPLICABLE", fairDrop.abuse.blocked), invalidTokenAttempts: compareValues("NOT_APPLICABLE", fairDrop.abuse.invalidTokenAttempts), duplicateAttempts: compareValues(baseline.abuse.duplicateAttempts, fairDrop.abuse.duplicateAttempts), ownershipFailures: compareValues("NOT_APPLICABLE", fairDrop.abuse.ownershipFailures) },
    allocation: { attempts: compareValues(baseline.allocation.attempts, fairDrop.allocation.attempts), successful: compareValues(baseline.allocation.successful, fairDrop.allocation.successful), rejected: compareValues(baseline.allocation.rejected, fairDrop.allocation.rejected), duplicates: compareValues(baseline.allocation.duplicates, fairDrop.allocation.duplicates), normalAllocationRate: compareValues(baselineNormalRate.value ?? 0, fairDropNormalRate.value ?? 0), attackAllocationRate: compareValues(baselineAttackRate.value ?? 0, fairDropAttackRate.value ?? 0) },
    integrity: Object.fromEntries((Object.keys(baseline.integrity) as (keyof SimulationMetrics["integrity"])[]).map((key) => [key, compareValues(baseline.integrity[key], fairDrop.integrity[key])])) as ExperimentComparison["integrity"],
    behaviorGroups: groups,
    fairness: { baselineNormalRate, baselineAttackRate, fairDropNormalRate, fairDropAttackRate, normalVsAttackDifference: compareValues((baselineNormalRate.value ?? 0) - (baselineAttackRate.value ?? 0), (fairDropNormalRate.value ?? 0) - (fairDropAttackRate.value ?? 0)) },
  };
}
