import assert from "node:assert/strict";
import test from "node:test";
import { aggregateDashboard } from "../lib/dashboard/dashboard-aggregation.ts";
import { emptySimulationMetrics } from "../lib/simulator/simulator-metrics.ts";

test("dashboard has truthful empty state without fabricated values", () => {
  const dashboard = aggregateDashboard(null, null);
  assert.equal(dashboard.hasData, false);
  assert.equal(dashboard.active, false);
  assert.equal(dashboard.operations.activeVirtualUsers, 0);
  assert.equal(dashboard.latestExperiment, null);
  assert.equal(dashboard.fairness.normalizedQueuePosition, null);
});

test("dashboard aggregates active real run metrics", () => {
  const metrics = emptySimulationMetrics(100);
  metrics.activeVirtualUsers = 25; metrics.totalRequests = 200; metrics.requestsPerSecond = 20;
  metrics.queue.successfulJoins = 80; metrics.allocation.successful = 20;
  metrics.queue.normalizedPositionSum = 20; metrics.queue.normalizedPositionCount = 40;
  metrics.behaviorGroups.NORMAL_TRAFFIC = { users: 70, requests: 100, queueSuccess: 60, allocationSuccess: 15 };
  metrics.behaviorGroups.BOT_SWARM = { users: 30, requests: 100, queueSuccess: 20, allocationSuccess: 5 };
  metrics.abuse.throttled = 12; metrics.abuse.blocked = 3; metrics.latency.p95Ms = 15; metrics.latency.p99Ms = 20;
  const dashboard = aggregateDashboard({ simulationRunId: "sim_1", status: "RUNNING", scenario: "MIXED_ATTACK", configuration: { virtualUsers: 100 }, metrics }, null);
  assert.equal(dashboard.active, true);
  assert.equal(dashboard.hasData, true);
  assert.equal(dashboard.operations.queueDepth, 60);
  assert.equal(dashboard.operations.seatsRemaining, 480);
  assert.equal(dashboard.fairness.normalizedQueuePosition, 0.5);
  assert.equal(dashboard.fairness.allocationRateByBehavior.BOT_SWARM, 5 / 30);
});

test("completed experiment state stops dashboard polling signal", () => {
  const metrics = emptySimulationMetrics(10);
  const dashboard = aggregateDashboard(null, { experimentId: "exp_1", name: "completed", status: "COMPLETED", scenario: "NORMAL_TRAFFIC", configuration: { virtualUsers: 10 }, baselineRunId: "b", fairDropRunId: "f", fairDropMetrics: metrics, comparison: null });
  assert.equal(dashboard.active, false);
  assert.equal(dashboard.latestExperiment?.status, "COMPLETED");
});
