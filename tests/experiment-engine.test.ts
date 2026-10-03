import assert from "node:assert/strict";
import test from "node:test";
import { runBaselineSimulation } from "../lib/experiments/baseline-engine.ts";
import { compareExperimentMetrics, compareValues } from "../lib/experiments/experiment-comparison.ts";
import { isTerminalExperimentStatus } from "../lib/experiments/experiment-types.ts";
import { emptySimulationMetrics } from "../lib/simulator/simulator-metrics.ts";

const config = (virtualUsers: number) => ({ virtualUsers, durationSeconds: 60, maxConcurrency: Math.min(500, virtualUsers), requestRate: 2_000, scenario: "MIXED_ATTACK" as const, seed: 12345 });
const runtime = { now: () => 1_700_000_000_000, sleep: async () => {} };

test("baseline replays the same deterministic workload for 100, 500, and 1,000 virtual users", async () => {
  for (const users of [100, 500, 1_000]) {
    const first = await runBaselineSimulation(`baseline_a_${users}`, "baseline-isolated-a", config(users), { cancelled: false }, undefined, runtime);
    const second = await runBaselineSimulation(`baseline_b_${users}`, "baseline-isolated-b", config(users), { cancelled: false }, undefined, runtime);
    assert.equal(first.metrics.completedVirtualUsers, users);
    assert.equal(first.metrics.totalRequests, second.metrics.totalRequests);
    assert.deepEqual(first.metrics.requestsByProfile, second.metrics.requestsByProfile);
    assert.equal(first.metrics.integrity.overselling, 0);
    assert.equal(first.metrics.integrity.duplicateSeatAssignments, 0);
  }
});

test("comparison handles zero denominators and marks baseline-only abuse controls not applicable", () => {
  const baseline = emptySimulationMetrics(100);
  const fairDrop = emptySimulationMetrics(100);
  baseline.totalRequests = fairDrop.totalRequests = 10;
  fairDrop.abuse.throttled = 4;
  fairDrop.responses.throttled429 = 4;
  baseline.integrity.overselling = 0;
  fairDrop.integrity.overselling = 0;
  const comparison = compareExperimentMetrics(baseline, fairDrop);
  assert.equal(comparison.abuse.throttled.baseline, "NOT_APPLICABLE");
  assert.equal(comparison.abuse.throttled.difference, "NOT_APPLICABLE");
  assert.equal(compareValues(0, 5).percentageDifference, "NOT_APPLICABLE");
  assert.equal(comparison.integrity.overselling.difference, 0);
});

test("baseline cancellation is finite and isolated in memory", async () => {
  const result = await runBaselineSimulation("baseline_cancel", "baseline-isolated", { ...config(100), scenario: "NORMAL_TRAFFIC", maxConcurrency: 1 }, { cancelled: true }, undefined, runtime);
  assert.equal(result.status, "CANCELLED");
  assert.equal(result.metrics.completedVirtualUsers, 0);
  assert.equal(result.dropId, "baseline-isolated");
  assert.equal(isTerminalExperimentStatus("CANCELLED"), true);
  assert.equal(isTerminalExperimentStatus("RUNNING_FAIRDROP"), false);
});
