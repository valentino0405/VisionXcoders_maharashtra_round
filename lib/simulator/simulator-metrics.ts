import type { SimulationAction, SimulationActionResult, SimulationMetrics, VirtualUserProfile } from "./simulator-types.ts";

export function emptySimulationMetrics(
  totalVirtualUsers: number,
  configuration?: { requestRate: number; maxConcurrency: number }
): SimulationMetrics {
  return {
    totalVirtualUsers, activeVirtualUsers: 0, completedVirtualUsers: 0, totalRequests: 0, requestsPerSecond: 0,
    execution: {
      configuredRequestRate: configuration?.requestRate ?? 0,
      elapsedMs: 0,
      workerLimit: configuration?.maxConcurrency ?? 0,
      activeWorkers: 0,
      peakActiveWorkers: 0,
      inFlightRequests: 0,
      peakInFlightRequests: 0,
      startedVirtualUsers: 0,
      timedOutVirtualUsers: 0,
      cancelledVirtualUsers: 0,
      failedVirtualUsers: 0,
      scheduledRequests: 0,
      lateScheduleCount: 0,
      scheduleDelayMs: 0,
      actionLatency: {},
      serviceTiming: { abuseMs: 0, fairDropServiceMs: 0 },
    },
    requestsByEndpoint: {}, requestsByProfile: {},
    responses: { success2xx: 0, client4xx: 0, throttled429: 0, server5xx: 0 },
    latency: { averageMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, sampleCount: 0 },
    abuse: { throttled: 0, blocked: 0, invalidTokenAttempts: 0, duplicateAttempts: 0, ownershipFailures: 0 },
    queue: { successfulJoins: 0, duplicateJoins: 0, failures: 0, normalizedPositionSum: 0, normalizedPositionCount: 0, positionBuckets: Array(10).fill(0) },
    allocation: { attempts: 0, successful: 0, rejected: 0, duplicates: 0 },
    behaviorGroups: {},
    integrity: { uniqueSeats: 0, duplicateSeatAssignments: 0, duplicateParticipantAllocations: 0, duplicateQueueEntries: 0, overselling: 0, seatsRemaining: 500 },
    errors: { timeouts: 0, connection: 0, unexpected: 0 },
  };
}

export function recordSimulationAction(
  metrics: SimulationMetrics,
  action: SimulationAction,
  profile: VirtualUserProfile,
  result: SimulationActionResult,
  latencies: number[]
): void {
  metrics.totalRequests += 1;
  metrics.execution.serviceTiming.abuseMs += result.timing?.abuseMs ?? 0;
  metrics.execution.serviceTiming.fairDropServiceMs += result.timing?.fairDropServiceMs ?? 0;
  const actionLatency = metrics.execution.actionLatency[action] ?? { count: 0, totalMs: 0, maxMs: 0 };
  actionLatency.count += 1;
  actionLatency.totalMs += result.latencyMs;
  actionLatency.maxMs = Math.max(actionLatency.maxMs, result.latencyMs);
  metrics.execution.actionLatency[action] = actionLatency;
  metrics.requestsByEndpoint[result.endpoint] = (metrics.requestsByEndpoint[result.endpoint] ?? 0) + 1;
  metrics.requestsByProfile[profile] = (metrics.requestsByProfile[profile] ?? 0) + 1;
  const group = metrics.behaviorGroups[profile] ?? { users: 0, requests: 0, queueSuccess: 0, allocationSuccess: 0 };
  group.requests += 1;
  metrics.behaviorGroups[profile] = group;
  if (result.statusCode >= 200 && result.statusCode < 300) metrics.responses.success2xx += 1;
  else if (result.statusCode === 429) { metrics.responses.throttled429 += 1; metrics.abuse.throttled += 1; }
  else if (result.statusCode === 403) { metrics.responses.client4xx += 1; metrics.abuse.blocked += 1; }
  else if (result.statusCode >= 400 && result.statusCode < 500) metrics.responses.client4xx += 1;
  else if (result.statusCode >= 500) metrics.responses.server5xx += 1;
  if (result.duplicate) metrics.abuse.duplicateAttempts += 1;
  if (result.invalidToken) metrics.abuse.invalidTokenAttempts += 1;
  if (result.ownershipFailure) metrics.abuse.ownershipFailures += 1;
  if (result.timeout) metrics.errors.timeouts += 1;
  if (result.connectionError) metrics.errors.connection += 1;
  if (action === "QUEUE_JOIN") {
    if (result.statusCode >= 200 && result.statusCode < 300 && result.duplicate) metrics.queue.duplicateJoins += 1;
    else if (result.statusCode >= 200 && result.statusCode < 300) { metrics.queue.successfulJoins += 1; group.queueSuccess += 1; }
    else metrics.queue.failures += 1;
    if (result.queuePosition && result.queueSize) {
      const normalized = result.queuePosition / result.queueSize;
      metrics.queue.normalizedPositionSum += normalized;
      metrics.queue.normalizedPositionCount += 1;
      metrics.queue.positionBuckets[Math.min(9, Math.floor(normalized * 10))] += 1;
    }
  }
  if (action === "ALLOCATION_CLAIM") {
    metrics.allocation.attempts += 1;
    if (result.statusCode >= 200 && result.statusCode < 300) {
      if (result.duplicate) metrics.allocation.duplicates += 1;
      else { metrics.allocation.successful += 1; group.allocationSuccess += 1; }
    } else metrics.allocation.rejected += 1;
  }
  if (Number.isFinite(result.latencyMs) && result.latencyMs >= 0) latencies.push(result.latencyMs);
}

export function finalizeLatency(metrics: SimulationMetrics, latencies: number[], elapsedMs: number): void {
  const sorted = [...latencies].sort((a, b) => a - b);
  const percentile = (value: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] : 0;
  metrics.requestsPerSecond = elapsedMs > 0 ? metrics.totalRequests / (elapsedMs / 1_000) : 0;
  metrics.execution.elapsedMs = elapsedMs;
  metrics.latency = {
    averageMs: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99), maxMs: sorted.at(-1) ?? 0, sampleCount: sorted.length,
  };
}
