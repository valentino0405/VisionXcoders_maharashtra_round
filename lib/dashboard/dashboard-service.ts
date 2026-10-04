import "server-only";

import connectToDatabase from "@/lib/mongodb";
import Experiment from "@/models/Experiment";
import SimulationRun from "@/models/SimulationRun";
import { aggregateDashboard } from "./dashboard-aggregation.ts";
import type { ExperimentComparison } from "@/lib/experiments/experiment-types.ts";
import type { SimulationMetrics } from "@/lib/simulator/simulator-types.ts";

export async function getDashboardData() {
  await connectToDatabase();
  const [run, experiment] = await Promise.all([SimulationRun.findOne().sort({ createdAt: -1 }).lean(), Experiment.findOne().sort({ createdAt: -1 }).lean()]);
  return aggregateDashboard(run ? { simulationRunId: run.simulationRunId, status: run.status, scenario: run.scenario, configuration: run.configuration, metrics: run.metrics as unknown as SimulationMetrics } : null, experiment ? {
    experimentId: experiment.experimentId, name: experiment.name, status: experiment.status, scenario: experiment.scenario, configuration: experiment.configuration,
    baselineRunId: experiment.baselineRunId, fairDropRunId: experiment.fairDropRunId,
    baselineMetrics: experiment.baselineMetrics as unknown as SimulationMetrics | null, fairDropMetrics: experiment.fairDropMetrics as unknown as SimulationMetrics | null,
    comparison: experiment.comparison as unknown as ExperimentComparison | null,
  } : null);
}
