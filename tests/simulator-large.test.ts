import assert from "node:assert/strict";
import test from "node:test";
import { runSimulation } from "../lib/simulator/simulator-engine.ts";

test("5,000 virtual users remain bounded by 500 workers", async () => {
  let active = 0; let peak = 0;
  const result = await runSimulation("sim_large", "fairdrop-sim-test", { virtualUsers: 5_000, durationSeconds: 60, maxConcurrency: 500, requestRate: 2_000, scenario: "NORMAL_TRAFFIC", seed: 7 }, {
    executeAction: async (_user, action) => { active += 1; peak = Math.max(peak, active); await Promise.resolve(); active -= 1; return { endpoint: action, statusCode: 200, latencyMs: 1 }; },
    now: () => 1_700_000_000_000, sleep: async () => {},
  });
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.metrics.completedVirtualUsers, 5_000);
  assert.ok(peak <= 500);
  assert.ok(result.metrics.execution.peakInFlightRequests >= peak);
  assert.ok(result.metrics.execution.peakInFlightRequests <= 500);
  assert.equal(result.metrics.execution.scheduledRequests, result.metrics.totalRequests);
});
