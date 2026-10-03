import "server-only";

import { randomUUID } from "node:crypto";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { claimAllocationForUser } from "@/lib/allocation-service";
import { getFairDropEnvironment, participantRedisKey } from "@/lib/drop-engine";
import { joinDropForUser } from "@/lib/drop-service";
import connectToDatabase from "@/lib/mongodb";
import { queueEntryKey, queueOrderKey, queueSequenceKey } from "@/lib/queue-engine";
import { getQueueStatusForUser, enterQueueForUser } from "@/lib/queue-service";
import { getQueueTokenSecret, issueQueueToken, verifyQueueTokenDetailed } from "@/lib/queue-token";
import { getRedisClient } from "@/lib/redis";
import { sessionRedisKey, recoverSessionForUser } from "@/lib/session-service";
import Allocation from "@/models/Allocation";
import Drop from "@/models/Drop";
import Participation from "@/models/Participation";
import QueueEntry from "@/models/QueueEntry";
import { emptySimulationMetrics } from "./simulator-metrics.ts";
import { runSimulation, validateSimulationConfig } from "./simulator-engine.ts";
import { completeSimulationRun, createSimulationRun, updateSimulationRun } from "./simulator-run-store.ts";
import type { SimulationAction, SimulationActionResult, SimulationConfig, SimulationRunStatus, VirtualUser } from "./simulator-types.ts";

const activeRuns = new Map<string, { cancelled: boolean }>();
type UserState = { token?: string; sessionId?: string };

function runId() { return `sim_${new Date().toISOString().replace(/[-:.TZ]/g, "")}_${randomUUID().slice(0, 8)}`; }
function simulationDropId(id: string) { return `fairdrop-sim-${id.toLowerCase().replaceAll("_", "-").slice(-40)}`; }
function denied(decision: { classification: string }) { return decision.classification === "THROTTLED" ? 429 : decision.classification === "BLOCKED" ? 403 : 0; }

async function ensureSimulationDrop(dropId: string) {
  const now = new Date();
  await Drop.findOneAndUpdate({ dropId }, { $setOnInsert: { dropId, name: "Isolated FairDrop Simulator Drop", capacity: 500, status: "ACTIVE", startsAt: now, endsAt: null } }, { upsert: true, new: true });
}

export async function cleanupSimulation(dropId: string, users: VirtualUser[], states: Map<number, UserState>) {
  const environment = getFairDropEnvironment();
  const redis = getRedisClient();
  const queues = await QueueEntry.find({ dropId }).lean();
  const allocations = await Allocation.find({ dropId }).lean();
  const keys = [queueSequenceKey(environment, dropId), queueOrderKey(environment, dropId)];
  for (const queue of queues) keys.push(queueEntryKey(environment, dropId, queue.participantId));
  for (const allocation of allocations) {
    keys.push(`fairdrop:${environment}:allocation:participant:${dropId}:${allocation.participantId}`);
    keys.push(`fairdrop:${environment}:allocation:seat:${dropId}:${allocation.seatId}`);
  }
  users.forEach((user) => {
    keys.push(participantRedisKey(environment, dropId, user.clerkId));
    keys.push(
      `fairdrop:${environment}:ratelimit:user:${user.clerkId}:short`,
      `fairdrop:${environment}:ratelimit:user:${user.clerkId}:minute`,
      `fairdrop:${environment}:abuse:user:${user.clerkId}:signals`,
      `fairdrop:${environment}:abuse:throttle:${user.clerkId}`,
      `fairdrop:${environment}:abuse:block:${user.clerkId}`
    );
    for (const action of ["drop_join", "queue_join", "queue_status", "allocation_claim"]) {
      keys.push(`fairdrop:${environment}:ratelimit:${action}:${user.clerkId}:${dropId}`);
    }
    keys.push(`fairdrop:${environment}:ratelimit:session_recovery:${user.clerkId}:global`);
    const sessionId = states.get(user.index)?.sessionId;
    if (sessionId) keys.push(sessionRedisKey(environment, sessionId));
  });
  for (let index = 0; index < keys.length; index += 500) await redis.del(...keys.slice(index, index + 500));
  await Promise.all([Allocation.deleteMany({ dropId }), QueueEntry.deleteMany({ dropId }), Participation.deleteMany({ dropId }), Drop.deleteOne({ dropId })]);
}

async function action(user: VirtualUser, requested: SimulationAction, dropId: string, states: Map<number, UserState>): Promise<SimulationActionResult> {
  const started = performance.now();
  const decision = await evaluateAbuseRequest({ clerkId: user.clerkId, action: requested === "SESSION_RECOVERY" ? "SESSION_RECOVERY" : requested === "ALLOCATION_CLAIM" ? "ALLOCATION_CLAIM" : requested === "DROP_JOIN" ? "DROP_JOIN" : requested === "QUEUE_JOIN" ? "QUEUE_JOIN" : "QUEUE_STATUS", endpoint: `sim:${requested}`, dropId });
  const blocked = denied(decision);
  if (blocked) return { endpoint: requested, statusCode: blocked, latencyMs: performance.now() - started };
  try {
    if (requested === "DROP_JOIN") {
      const result = await joinDropForUser(dropId, user.clerkId);
      if (!result.created) await recordAbuseEvent({ clerkId: user.clerkId, action: "DROP_JOIN", event: "DUPLICATE_DROP_JOIN", endpoint: "sim:drop", dropId });
      return { endpoint: "/api/drop/join", statusCode: result.created ? 201 : 200, duplicate: !result.created, participantId: result.participant.participantId, latencyMs: performance.now() - started };
    }
    if (requested === "QUEUE_JOIN") {
      const result = await enterQueueForUser(dropId, user.clerkId);
      if (!result.created) await recordAbuseEvent({ clerkId: user.clerkId, action: "QUEUE_JOIN", event: "DUPLICATE_QUEUE_JOIN", endpoint: "sim:queue", dropId });
      states.set(user.index, { ...states.get(user.index), token: issueQueueToken(result.queue, getQueueTokenSecret()) });
      return { endpoint: "/api/queue/join", statusCode: result.created ? 201 : 200, duplicate: !result.created, participantId: result.queue.participantId, queuePosition: result.queue.position, queueSize: result.totalQueued, latencyMs: performance.now() - started };
    }
    if (requested === "QUEUE_STATUS") {
      const result = await getQueueStatusForUser(dropId, user.clerkId);
      return { endpoint: "/api/queue/status", statusCode: "error" in result ? 409 : 200, latencyMs: performance.now() - started };
    }
    if (requested === "SESSION_RECOVERY") {
      const result = await recoverSessionForUser(user.clerkId, states.get(user.index)?.sessionId);
      states.set(user.index, { ...states.get(user.index), sessionId: result.session.sessionId });
      return { endpoint: "/api/session", statusCode: 200, latencyMs: performance.now() - started };
    }
    if (requested === "ALLOCATION_CLAIM") {
      const result = await claimAllocationForUser(dropId, user.clerkId);
      return { endpoint: "/api/allocation/claim", statusCode: result.created ? 201 : 200, duplicate: !result.created, participantId: result.allocation.participantId, seatId: result.allocation.seatId, latencyMs: performance.now() - started };
    }
    const token = states.get(user.index)?.token ?? "malformed";
    const verification = verifyQueueTokenDetailed(token, { dropId, participantId: "wrong-participant", queueEntryId: "wrong-entry" }, getQueueTokenSecret());
    const event = verification.valid ? "INVALID_QUEUE_TOKEN" : verification.reason === "CROSS_DROP" ? "CROSS_DROP_TOKEN" : verification.reason === "CROSS_PARTICIPANT" || verification.reason === "CROSS_QUEUE_ENTRY" ? "CROSS_PARTICIPANT_TOKEN" : "INVALID_QUEUE_TOKEN";
    const post = await recordAbuseEvent({ clerkId: user.clerkId, action: "QUEUE_STATUS", event, endpoint: "sim:token", dropId });
    return { endpoint: "/api/queue/status", statusCode: denied(post) || 401, invalidToken: true, ownershipFailure: event !== "INVALID_QUEUE_TOKEN", latencyMs: performance.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { endpoint: requested, statusCode: 500, latencyMs: performance.now() - started, connectionError: /unavailable|connect/i.test(message) };
  }
}

async function execute(run: { simulationRunId: string; dropId: string; config: SimulationConfig; control: { cancelled: boolean } }) {
  try {
    if (run.control.cancelled) {
      await updateSimulationRun(run.simulationRunId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }
    await updateSimulationRun(run.simulationRunId, { status: "RUNNING", startedAt: new Date() });
    const result = await runFairDropSimulation(run.simulationRunId, run.dropId, run.config, run.control, async (metrics) => {
      await updateSimulationRun(run.simulationRunId, { status: run.control.cancelled ? "STOPPING" : "RUNNING", metrics });
    });
    await completeSimulationRun(result);
  } catch (error) {
    await updateSimulationRun(run.simulationRunId, { status: "FAILED", completedAt: new Date(), errorSummary: error instanceof Error ? error.message.slice(0, 500) : "Unexpected simulator failure" });
  } finally {
    activeRuns.delete(run.simulationRunId);
  }
}

/** Awaitable real-engine runner used by both Phase 8 and isolated experiments. */
export async function runFairDropSimulation(
  simulationRunId: string,
  dropId: string,
  config: SimulationConfig,
  control: { cancelled: boolean },
  onProgress?: (metrics: import("./simulator-types.ts").SimulationMetrics) => Promise<void> | void
) {
  const users = new Map<number, VirtualUser>();
  const states = new Map<number, UserState>();
  try {
    await Promise.all([Participation.init(), QueueEntry.init(), Allocation.init()]);
    await ensureSimulationDrop(dropId);
    return await runSimulation(simulationRunId, dropId, config, {
      executeAction: async (user, requested) => { users.set(user.index, user); return action(user, requested, dropId, states); },
      isCancelled: () => control.cancelled,
      onProgress,
    });
  } finally {
    await cleanupSimulation(dropId, [...users.values()], states).catch(() => console.error("Simulator cleanup failed"));
  }
}

export async function startSimulation(config: SimulationConfig) {
  const resolved = validateSimulationConfig(config);
  await connectToDatabase();
  const simulationRunId = runId();
  const dropId = simulationDropId(simulationRunId);
  const control = { cancelled: false };
  activeRuns.set(simulationRunId, control);
  await createSimulationRun({ simulationRunId, dropId, scenario: resolved.scenario, configuration: resolved, metrics: emptySimulationMetrics(resolved.virtualUsers) });
  await updateSimulationRun(simulationRunId, { status: "STARTING" });
  void execute({ simulationRunId, dropId, config: resolved, control });
  return { simulationRunId, dropId, status: "STARTING" as SimulationRunStatus };
}
export async function stopSimulation(simulationRunId: string) {
  const control = activeRuns.get(simulationRunId);
  if (!control) return false;
  control.cancelled = true;
  await updateSimulationRun(simulationRunId, { status: "STOPPING" });
  return true;
}
