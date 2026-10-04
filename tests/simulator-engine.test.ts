import assert from "node:assert/strict";
import test from "node:test";
import { runSimulation, SimulationConfigError, validateSimulationConfig } from "../lib/simulator/simulator-engine.ts";

const config = (virtualUsers: number, scenario = "NORMAL_TRAFFIC") => ({ virtualUsers, durationSeconds: 60, maxConcurrency: Math.min(100, virtualUsers), requestRate: 2_000, scenario: scenario as "NORMAL_TRAFFIC", seed: 42 });
const now = () => 1_700_000_000_000;
const dependencies = () => ({ executeAction: async (_user: unknown, action: string) => ({ endpoint: action, statusCode: 200, latencyMs: 2 }), now, sleep: async () => {} });

test("validates configurable safety limits through 50,000 virtual users", () => {
  assert.equal(validateSimulationConfig(config(50_000)).virtualUsers, 50_000);
  assert.throws(() => validateSimulationConfig(config(50_001)), SimulationConfigError);
  assert.throws(() => validateSimulationConfig({ ...config(100), maxConcurrency: 501 }), SimulationConfigError);
});

test("100 virtual users run with bounded workers and aggregate metrics", async () => {
  const result = await runSimulation("sim_test_100", "fairdrop-sim-test", config(100), dependencies());
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.metrics.totalVirtualUsers, 100);
  assert.equal(result.metrics.completedVirtualUsers, 100);
  assert.equal(result.metrics.responses.success2xx, result.metrics.totalRequests);
  assert.equal(result.metrics.latency.sampleCount, result.metrics.totalRequests);
  assert.equal(result.metrics.execution.configuredRequestRate, 2_000);
  assert.equal(result.metrics.execution.scheduledRequests, result.metrics.totalRequests);
  assert.ok(result.metrics.execution.peakInFlightRequests <= 100);
});

test("1,000 virtual users produce deterministic profile assignment and finite execution", async () => {
  const first = await runSimulation("sim_test_1000_a", "fairdrop-sim-test", { ...config(1_000, "MIXED_ATTACK"), scenario: "MIXED_ATTACK" }, dependencies());
  const second = await runSimulation("sim_test_1000_b", "fairdrop-sim-test", { ...config(1_000, "MIXED_ATTACK"), scenario: "MIXED_ATTACK" }, dependencies());
  assert.equal(first.metrics.requestsByProfile.NORMAL_TRAFFIC, second.metrics.requestsByProfile.NORMAL_TRAFFIC);
  assert.equal(first.metrics.completedVirtualUsers, 1_000);
});

test("request-flood metrics account for throttles and duplicate attempts from actual action results", async () => {
  const result = await runSimulation("sim_flood", "fairdrop-sim-test", { ...config(20, "REQUEST_FLOOD"), scenario: "REQUEST_FLOOD" }, {
    ...dependencies(), executeAction: async (_user, action) => ({ endpoint: action, statusCode: action === "QUEUE_STATUS" ? 429 : 200, latencyMs: 4, duplicate: action === "QUEUE_JOIN" }),
  });
  assert.ok(result.metrics.responses.throttled429 > 0);
  assert.ok(result.metrics.abuse.duplicateAttempts > 0);
  assert.ok(result.metrics.queue.duplicateJoins > 0);
});

test("cancellation terminates a controlled run", async () => {
  let calls = 0;
  const result = await runSimulation("sim_cancel", "fairdrop-sim-test", { ...config(100), maxConcurrency: 1 }, {
    ...dependencies(), isCancelled: () => calls >= 1, executeAction: async () => { calls += 1; return { endpoint: "x", statusCode: 200, latencyMs: 1 }; },
  });
  assert.equal(result.status, "CANCELLED");
  assert.ok(result.metrics.completedVirtualUsers < 100);
  assert.equal(result.metrics.execution.cancelledVirtualUsers, 1);
});
