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

const [{ default: connectToDatabase }, { runFairDropSimulation }] = await Promise.all([
  import("@/lib/mongodb.ts"),
  import("@/lib/simulator/simulator-service.ts"),
]);

await connectToDatabase();

const simulationRunId = `sim_live_${new Date().toISOString().replace(/[-:.TZ]/g, "")}_${randomUUID().slice(0, 8)}`;
const dropId = `fairdrop-sim-live-${randomUUID().replaceAll("-", "")}`;
const result = await runFairDropSimulation(
  simulationRunId,
  dropId,
  { virtualUsers, durationSeconds, maxConcurrency, requestRate, scenario, seed },
  { cancelled: false }
);

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
  responses: result.metrics.responses,
  serviceTiming: result.metrics.execution.serviceTiming,
  integrity: result.metrics.integrity,
}, null, 2));
