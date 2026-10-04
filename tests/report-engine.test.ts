import assert from "node:assert/strict";
import test from "node:test";
import { compareExperimentMetrics } from "../lib/experiments/experiment-comparison.ts";
import { generateExperimentReport, ReportError, type ReportExperiment } from "../lib/reports/report-engine.ts";
import { reportErrorResponse } from "../lib/reports/report-http.ts";
import { emptySimulationMetrics } from "../lib/simulator/simulator-metrics.ts";

function completedExperiment(): ReportExperiment {
  const baseline = emptySimulationMetrics(100);
  const fairDrop = emptySimulationMetrics(100);
  baseline.totalRequests = fairDrop.totalRequests = 500;
  baseline.responses.success2xx = 500; fairDrop.responses.success2xx = 450; fairDrop.responses.throttled429 = 20;
  baseline.latency.p50Ms = 2; baseline.latency.p95Ms = 7; baseline.latency.p99Ms = 9;
  fairDrop.latency.p50Ms = 3; fairDrop.latency.p95Ms = 8; fairDrop.latency.p99Ms = 12;
  baseline.behaviorGroups.NORMAL_TRAFFIC = { users: 60, requests: 300, queueSuccess: 60, allocationSuccess: 40 };
  baseline.behaviorGroups.BOT_SWARM = { users: 40, requests: 200, queueSuccess: 40, allocationSuccess: 35 };
  fairDrop.behaviorGroups.NORMAL_TRAFFIC = { users: 60, requests: 300, queueSuccess: 60, allocationSuccess: 42 };
  fairDrop.behaviorGroups.BOT_SWARM = { users: 40, requests: 200, queueSuccess: 20, allocationSuccess: 10 };
  fairDrop.integrity.duplicateQueueEntries = 0; fairDrop.integrity.overselling = 0;
  return { experimentId: "exp_report", name: "Report fixture", scenario: "MIXED_ATTACK", status: "COMPLETED", seed: 42, configuration: { virtualUsers: 100, durationSeconds: 60, requestRate: 250, maxConcurrency: 100 }, baselineRunId: "baseline", fairDropRunId: "fairdrop", createdAt: new Date(0), startedAt: new Date(1), completedAt: new Date(2), baselineMetrics: baseline, fairDropMetrics: fairDrop, comparison: compareExperimentMetrics(baseline, fairDrop) };
}

test("generates a safe completed report with performance, integrity, and fairness", () => {
  const report = generateExperimentReport(completedExperiment());
  assert.equal(report.summary.virtualUsers, 100);
  assert.equal(report.performance.latency.p95Ms.difference, 1);
  assert.equal(report.integrity.overselling.fairDrop, 0);
  assert.equal(report.abuse.throttled.baseline, "NOT_APPLICABLE");
  assert.equal(report.fairness.fairDropNormalRate.value, 42 / 60);
  assert.ok(report.fairness.fairDropNormalRate.confidenceInterval95);
});

test("rejects missing, incomplete, missing-metric, and incompatible reports", () => {
  assert.throws(() => generateExperimentReport(null), (error: unknown) => error instanceof ReportError && error.code === "REPORT_NOT_FOUND");
  const incomplete = completedExperiment(); incomplete.status = "RUNNING_FAIRDROP";
  assert.throws(() => generateExperimentReport(incomplete), (error: unknown) => error instanceof ReportError && error.code === "REPORT_INCOMPLETE");
  const missing = completedExperiment(); missing.comparison = null;
  assert.throws(() => generateExperimentReport(missing), (error: unknown) => error instanceof ReportError && error.code === "REPORT_INCOMPLETE");
  const mismatch = completedExperiment(); mismatch.configuration.virtualUsers = 101;
  assert.throws(() => generateExperimentReport(mismatch), (error: unknown) => error instanceof ReportError && error.code === "REPORT_INCOMPATIBLE");
});

test("report retains zero-safe comparison and not-applicable values", () => {
  const report = generateExperimentReport(completedExperiment());
  assert.equal(report.abuse.blocked.percentageDifference, "NOT_APPLICABLE");
  assert.equal(report.integrity.overselling.percentageDifference, "NOT_APPLICABLE");
  assert.equal(report.charts.allocation.normal.fairDrop, 42 / 60);
});

test("report API outcome mapping preserves safe missing and incomplete states", () => {
  assert.deepEqual(reportErrorResponse(new ReportError("REPORT_NOT_FOUND", "missing")), { status: 404, body: { error: "REPORT_NOT_FOUND", detail: "missing" } });
  assert.equal(reportErrorResponse(new ReportError("REPORT_INCOMPLETE", "pending")).status, 409);
  assert.equal(reportErrorResponse(new Error("db")).body.error, "REPORT_UNAVAILABLE");
});
