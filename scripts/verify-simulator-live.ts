import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.local");

function numberOption(name: string, fallback: number): number {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
}

const virtualUsers = numberOption("users", 100);
const durationSeconds = numberOption("duration", 60);
const maxConcurrency = numberOption("concurrency", Math.min(100, virtualUsers));
const requestRate = numberOption("rate", 250);
const scenario = (process.argv.find((argument) => argument.startsWith("--scenario="))?.slice(11) ?? "NORMAL_TRAFFIC") as import("@/lib/simulator/simulator-types.ts").SimulationScenario;
const seed = numberOption("seed", 12345);
const progressEverySeconds = numberOption("progress", 10);

console.log(`Connecting for ${virtualUsers.toLocaleString()} virtual users…`);

const [{ default: connectToDatabase }, { runFairDropSimulation }, mongooseModule] = await Promise.all([
  import("@/lib/mongodb.ts"),
  import("@/lib/simulator/simulator-service.ts"),
  import("mongoose"),
]);

await connectToDatabase();
console.log("Connected. Starting isolated real-service simulator run…");

const simulationRunId = `sim_live_${new Date().toISOString().replace(/[-:.TZ]/g, "")}_${randomUUID().slice(0, 8)}`;
const dropId = `fairdrop-sim-live-${randomUUID().replaceAll("-", "")}`;
let result: Awaited<ReturnType<typeof runFairDropSimulation>>;
try {
  result = await runFairDropSimulation(
    simulationRunId,
    dropId,
    { virtualUsers, durationSeconds, maxConcurrency, requestRate, scenario, seed },
    { cancelled: false },
    (() => {
      let lastLoggedAt = 0;
      return (metrics) => {
        const now = Date.now();
        if (now - lastLoggedAt < progressEverySeconds * 1_000) return;
        lastLoggedAt = now;
        console.log(JSON.stringify({
          progress: `${metrics.completedVirtualUsers}/${metrics.totalVirtualUsers}`,
          requests: metrics.totalRequests,
          actualRequestsPerSecond: Number(metrics.requestsPerSecond.toFixed(1)),
          peakInFlight: metrics.execution.peakInFlightRequests,
          timedOut: metrics.execution.timedOutVirtualUsers,
        }));
      };
    })()
  );
} finally {
  await mongooseModule.default.disconnect();
}

assert.equal(result.metrics.integrity.duplicateSeatAssignments, 0);
assert.equal(result.metrics.integrity.duplicateParticipantAllocations, 0);
assert.equal(result.metrics.integrity.duplicateQueueEntries, 0);
assert.equal(result.metrics.integrity.overselling, 0);

console.log(JSON.stringify({
  simulationRunId: result.simulationRunId,
  status: result.status,
  users: {
    total: result.metrics.totalVirtualUsers,
    completed: result.metrics.completedVirtualUsers,
    timedOut: result.metrics.execution.timedOutVirtualUsers,
    cancelled: result.metrics.execution.cancelledVirtualUsers,
    failed: result.metrics.execution.failedVirtualUsers,
  },
  requests: {
    total: result.metrics.totalRequests,
    targetPerSecond: result.metrics.execution.configuredRequestRate,
    actualPerSecond: result.metrics.requestsPerSecond,
    peakInFlight: result.metrics.execution.peakInFlightRequests,
  },
  latency: result.metrics.latency,
  actionLatency: Object.fromEntries(
    Object.entries(result.metrics.execution.actionLatency).map(([action, timing]) => [
      action,
      {
        count: timing.count,
        averageMs: timing.count ? timing.totalMs / timing.count : 0,
        maxMs: timing.maxMs,
      },
    ])
  ),
  responses: result.metrics.responses,
  serviceTiming: result.metrics.execution.serviceTiming,
  integrity: result.metrics.integrity,
}, null, 2));
