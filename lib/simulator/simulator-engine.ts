import { createVirtualUser } from "./simulator-users.ts";
import { emptySimulationMetrics, finalizeLatency, recordSimulationAction } from "./simulator-metrics.ts";
import {
  MAX_CONCURRENCY, MAX_DURATION_SECONDS, MAX_REQUEST_RATE, MAX_VIRTUAL_USERS,
  SIMULATION_SCENARIOS,
  type ResolvedSimulationConfig, type SimulationAction, type SimulationActionResult,
  type SimulationConfig, type SimulationResult, type VirtualUser, type VirtualUserProfile,
} from "./simulator-types.ts";

const DEFAULT_DISTRIBUTION: Record<VirtualUserProfile, number> = {
  NORMAL_TRAFFIC: 65, REQUEST_FLOOD: 10, BOT_SWARM: 10, DUPLICATE_ATTEMPTS: 5, TOKEN_REPLAY: 5, QUEUE_MANIPULATION: 5,
};

export class SimulationConfigError extends Error {
  constructor(message: string) { super(message); this.name = "SimulationConfigError"; }
}

export function validateSimulationConfig(config: SimulationConfig): ResolvedSimulationConfig {
  if (!SIMULATION_SCENARIOS.includes(config.scenario)) throw new SimulationConfigError("Unsupported simulation scenario");
  const integer = (value: number, label: string, max: number) => {
    if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new SimulationConfigError(`${label} exceeds simulator safety limits`);
  };
  integer(config.virtualUsers, "virtualUsers", MAX_VIRTUAL_USERS);
  integer(config.durationSeconds, "durationSeconds", MAX_DURATION_SECONDS);
  integer(config.maxConcurrency, "maxConcurrency", MAX_CONCURRENCY);
  integer(config.requestRate, "requestRate", MAX_REQUEST_RATE);
  if (config.burstSize !== undefined && (!Number.isSafeInteger(config.burstSize) || config.burstSize < 1 || config.burstSize > 100)) throw new SimulationConfigError("burstSize exceeds simulator safety limits");
  if (config.jitterMs !== undefined && (!Number.isSafeInteger(config.jitterMs) || config.jitterMs < 0 || config.jitterMs > 10_000)) throw new SimulationConfigError("jitterMs exceeds simulator safety limits");
  if (config.warmupSeconds !== undefined && (!Number.isSafeInteger(config.warmupSeconds) || config.warmupSeconds < 0 || config.warmupSeconds >= config.durationSeconds)) throw new SimulationConfigError("warmupSeconds must be shorter than durationSeconds");
  if (config.maxConcurrency > config.virtualUsers) throw new SimulationConfigError("maxConcurrency cannot exceed virtualUsers");
  const distribution = { ...DEFAULT_DISTRIBUTION, ...config.attackDistribution };
  if (config.scenario === "MIXED_ATTACK") {
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
    if (!Object.values(distribution).every((value) => Number.isFinite(value) && value >= 0) || total !== 100) {
      throw new SimulationConfigError("Mixed attack distribution must total 100 percent");
    }
  }
  return {
    ...config,
    seed: Number.isSafeInteger(config.seed) ? config.seed! : 20260308,
    burstSize: config.burstSize ?? 1,
    jitterMs: config.jitterMs ?? 0,
    warmupSeconds: config.warmupSeconds ?? 0,
    attackDistribution: distribution,
  };
}

function actionsForProfile(profile: VirtualUserProfile, burstSize: number): SimulationAction[] {
  switch (profile) {
    case "REQUEST_FLOOD": return ["DROP_JOIN", "QUEUE_JOIN", ...Array.from({ length: 4 + burstSize }, () => "QUEUE_STATUS" as const), "QUEUE_JOIN", "QUEUE_JOIN"];
    case "BOT_SWARM": return ["DROP_JOIN", "QUEUE_JOIN", "QUEUE_JOIN", "QUEUE_STATUS", "QUEUE_STATUS", "ALLOCATION_CLAIM"];
    case "DUPLICATE_ATTEMPTS": return ["DROP_JOIN", "DROP_JOIN", "QUEUE_JOIN", "QUEUE_JOIN", "ALLOCATION_CLAIM", "ALLOCATION_CLAIM"];
    case "TOKEN_REPLAY": return ["DROP_JOIN", "QUEUE_JOIN", "TOKEN_REPLAY", "TOKEN_REPLAY", "QUEUE_STATUS"];
    case "QUEUE_MANIPULATION": return ["DROP_JOIN", "QUEUE_JOIN", "QUEUE_JOIN", "QUEUE_JOIN", "QUEUE_STATUS", "QUEUE_STATUS"];
    default: return ["DROP_JOIN", "QUEUE_JOIN", "QUEUE_STATUS", "SESSION_RECOVERY", "ALLOCATION_CLAIM"];
  }
}

export type SimulationDependencies = {
  executeAction: (user: VirtualUser, action: SimulationAction) => Promise<SimulationActionResult>;
  isCancelled?: () => boolean;
  onProgress?: (metrics: SimulationResult["metrics"]) => Promise<void> | void;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function runSimulation(
  simulationRunId: string,
  dropId: string,
  input: SimulationConfig,
  dependencies: SimulationDependencies
): Promise<SimulationResult> {
  const configuration = validateSimulationConfig(input);
  const now = dependencies.now ?? Date.now;
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const startedMs = now();
  const deadline = startedMs + configuration.durationSeconds * 1_000;
  const metrics = emptySimulationMetrics(configuration.virtualUsers, configuration);
  const latencies: number[] = [];
  const queuedParticipants = new Set<string>();
  const allocatedParticipants = new Set<string>();
  const allocatedSeats = new Set<string>();
  let nextUserIndex = 0;
  let nextRequestAt = startedMs;
  let lastProgressAt = startedMs;
  let progressInFlight: Promise<void> | null = null;

  const reportProgress = (force = false) => {
    if (!dependencies.onProgress || progressInFlight || (!force && now() - lastProgressAt < 1_000)) return;
    lastProgressAt = now();
    progressInFlight = Promise.resolve(dependencies.onProgress(metrics))
      .catch(() => console.error("Simulator progress update failed"))
      .finally(() => {
        progressInFlight = null;
      });
  };

  const takeRateSlot = async () => {
    const slot = nextRequestAt;
    const current = now();
    nextRequestAt = Math.max(nextRequestAt, current) + 1_000 / configuration.requestRate;
    const wait = slot - current;
    if (wait < 0) {
      metrics.execution.lateScheduleCount += 1;
      metrics.execution.scheduleDelayMs += -wait;
    }
    if (wait > 0) await sleep(wait);
  };
  const worker = async () => {
    metrics.execution.activeWorkers += 1;
    metrics.execution.peakActiveWorkers = Math.max(metrics.execution.peakActiveWorkers, metrics.execution.activeWorkers);
    try {
      if (configuration.warmupSeconds) await sleep(configuration.warmupSeconds * 1_000);
      while (true) {
        if (dependencies.isCancelled?.() || now() >= deadline) return;
        const index = nextUserIndex++;
        if (index >= configuration.virtualUsers) return;
        const user = createVirtualUser(index, simulationRunId, configuration);
        const group = metrics.behaviorGroups[user.profile] ?? { users: 0, requests: 0, queueSuccess: 0, allocationSuccess: 0 };
        group.users += 1;
        metrics.behaviorGroups[user.profile] = group;
        metrics.activeVirtualUsers += 1;
        metrics.execution.startedVirtualUsers += 1;
        let interruption: "cancelled" | "timedOut" | "failed" | null = null;

        for (const action of actionsForProfile(user.profile, configuration.burstSize)) {
          if (dependencies.isCancelled?.()) { interruption = "cancelled"; break; }
          if (now() >= deadline) { interruption = "timedOut"; break; }
          await takeRateSlot();
          if (dependencies.isCancelled?.()) { interruption = "cancelled"; break; }
          if (now() >= deadline) { interruption = "timedOut"; break; }
          metrics.execution.scheduledRequests += 1;
          metrics.execution.inFlightRequests += 1;
          metrics.execution.peakInFlightRequests = Math.max(
            metrics.execution.peakInFlightRequests,
            metrics.execution.inFlightRequests
          );
          try {
            const result = await dependencies.executeAction(user, action);
            recordSimulationAction(metrics, action, user.profile, result, latencies);
            if (action === "QUEUE_JOIN" && result.statusCode < 300 && !result.duplicate && result.participantId) {
              if (queuedParticipants.has(result.participantId)) metrics.integrity.duplicateQueueEntries += 1;
              queuedParticipants.add(result.participantId);
            }
            if (action === "ALLOCATION_CLAIM" && result.statusCode < 300 && !result.duplicate) {
              if (result.participantId && allocatedParticipants.has(result.participantId)) metrics.integrity.duplicateParticipantAllocations += 1;
              if (result.seatId && allocatedSeats.has(result.seatId)) metrics.integrity.duplicateSeatAssignments += 1;
              if (result.participantId) allocatedParticipants.add(result.participantId);
              if (result.seatId) allocatedSeats.add(result.seatId);
            }
          } catch {
            recordSimulationAction(metrics, action, user.profile, { endpoint: "internal", statusCode: 500, latencyMs: 0 }, latencies);
            metrics.errors.unexpected += 1;
            metrics.execution.failedVirtualUsers += 1;
            interruption = "failed";
          } finally {
            metrics.execution.inFlightRequests -= 1;
          }
          const elapsedMs = Math.max(0, now() - startedMs);
          metrics.execution.elapsedMs = elapsedMs;
          metrics.requestsPerSecond = elapsedMs > 0 ? metrics.totalRequests / (elapsedMs / 1_000) : 0;
          if (interruption) break;
          if (configuration.jitterMs) await sleep((user.seed + metrics.totalRequests) % (configuration.jitterMs + 1));
          reportProgress();
        }
        metrics.activeVirtualUsers -= 1;
        if (interruption === "cancelled") {
          metrics.execution.cancelledVirtualUsers += 1;
          return;
        }
        if (interruption === "timedOut") {
          metrics.execution.timedOutVirtualUsers += 1;
          return;
        }
        if (interruption === "failed") {
          return;
        }
        metrics.completedVirtualUsers += 1;
      }
    } finally {
      metrics.execution.activeWorkers -= 1;
    }
  };

  await Promise.all(Array.from({ length: Math.min(configuration.maxConcurrency, configuration.virtualUsers) }, worker));
  const completedAt = new Date(now()).toISOString();
  finalizeLatency(metrics, latencies, Math.max(0, now() - startedMs));
  metrics.integrity.uniqueSeats = allocatedSeats.size;
  metrics.integrity.overselling = Math.max(0, allocatedSeats.size - 500);
  metrics.integrity.seatsRemaining = Math.max(0, 500 - allocatedSeats.size);
  reportProgress(true);
  await progressInFlight;
  return {
    simulationRunId, dropId, status: dependencies.isCancelled?.() ? "CANCELLED" : "COMPLETED",
    configuration, startedAt: new Date(startedMs).toISOString(), completedAt, metrics, errorSummary: null,
  };
}
