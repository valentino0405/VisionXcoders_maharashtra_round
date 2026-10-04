import type { ExperimentComparison } from "../experiments/experiment-types.ts";
import type { SimulationMetrics } from "../simulator/simulator-types.ts";

export class ReportError extends Error {
  readonly code: "REPORT_NOT_FOUND" | "REPORT_INCOMPLETE" | "REPORT_INCOMPATIBLE";
  constructor(code: "REPORT_NOT_FOUND" | "REPORT_INCOMPLETE" | "REPORT_INCOMPATIBLE", message: string) { super(message); this.code = code; }
}

export type ReportExperiment = {
  experimentId: string; name: string; scenario: string; status: string; seed: number; configuration: Record<string, unknown>;
  baselineRunId: string; fairDropRunId: string; createdAt?: Date | string; startedAt: Date | string | null; completedAt: Date | string | null;
  baselineMetrics: SimulationMetrics | null; fairDropMetrics: SimulationMetrics | null; comparison: ExperimentComparison | null;
};

const toIso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : null;

/** Converts persisted, aggregate experiment results into safe presentation data. */
export function generateExperimentReport(experiment: ReportExperiment | null) {
  if (!experiment) throw new ReportError("REPORT_NOT_FOUND", "Experiment not found");
  if (experiment.status !== "COMPLETED") throw new ReportError("REPORT_INCOMPLETE", "Reports are available only for completed experiments");
  if (!experiment.baselineMetrics || !experiment.fairDropMetrics || !experiment.comparison) throw new ReportError("REPORT_INCOMPLETE", "Completed experiment is missing aggregate results");
  const expectedUsers = Number(experiment.configuration.virtualUsers);
  if (!Number.isSafeInteger(expectedUsers) || expectedUsers < 1 || experiment.baselineMetrics.totalVirtualUsers !== expectedUsers || experiment.fairDropMetrics.totalVirtualUsers !== expectedUsers) {
    throw new ReportError("REPORT_INCOMPATIBLE", "Stored run metrics do not match the experiment configuration");
  }
  const comparison = experiment.comparison;
  return {
    experimentId: experiment.experimentId,
    summary: {
      name: experiment.name, scenario: experiment.scenario, virtualUsers: expectedUsers,
      durationSeconds: Number(experiment.configuration.durationSeconds), requestRate: Number(experiment.configuration.requestRate),
      concurrency: Number(experiment.configuration.maxConcurrency), seed: experiment.seed,
      createdAt: toIso(experiment.createdAt), startedAt: toIso(experiment.startedAt), completedAt: toIso(experiment.completedAt),
      baselineRunId: experiment.baselineRunId, fairDropRunId: experiment.fairDropRunId,
    },
    comparison,
    performance: { traffic: comparison.traffic, responses: comparison.responses, latency: comparison.latency, errors: comparison.errors },
    queue: comparison.queue,
    abuse: comparison.abuse,
    allocation: comparison.allocation,
    integrity: comparison.integrity,
    fairness: comparison.fairness,
    charts: {
      latency: { p50: comparison.latency.p50Ms, p95: comparison.latency.p95Ms, p99: comparison.latency.p99Ms },
      allocation: { normal: comparison.allocation.normalAllocationRate, attack: comparison.allocation.attackAllocationRate },
      integrity: { duplicateAllocations: comparison.integrity.duplicateParticipantAllocations, overselling: comparison.integrity.overselling, duplicateQueueEntries: comparison.integrity.duplicateQueueEntries },
      outcomes: { success2xx: comparison.responses.success2xx, client4xx: comparison.responses.client4xx, throttled429: comparison.responses.throttled429, server5xx: comparison.responses.server5xx },
    },
  };
}
