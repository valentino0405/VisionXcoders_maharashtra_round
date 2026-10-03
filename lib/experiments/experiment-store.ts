import "server-only";

import Experiment from "@/models/Experiment";
import type { ExperimentComparison, ExperimentStatus } from "./experiment-types.ts";
import type { SimulationMetrics } from "@/lib/simulator/simulator-types.ts";

export async function createExperiment(input: { experimentId: string; name: string; scenario: string; configuration: Record<string, unknown>; seed: number; baselineRunId: string; fairDropRunId: string }) {
  return Experiment.create({ ...input, status: "CREATED", baselineMetrics: null, fairDropMetrics: null, comparison: null, startedAt: null, completedAt: null, error: null });
}
export async function updateExperiment(experimentId: string, update: { status?: ExperimentStatus; baselineMetrics?: SimulationMetrics | null; fairDropMetrics?: SimulationMetrics | null; comparison?: ExperimentComparison | null; startedAt?: Date | null; completedAt?: Date | null; error?: string | null }) {
  return Experiment.findOneAndUpdate({ experimentId }, { $set: update }, { new: true }).lean();
}
export async function getExperiment(experimentId: string) { return Experiment.findOne({ experimentId }).lean(); }
export async function listExperiments(limit = 20) { return Experiment.find().sort({ createdAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean(); }
