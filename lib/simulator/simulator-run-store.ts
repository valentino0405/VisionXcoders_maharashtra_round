import "server-only";

import SimulationRun from "@/models/SimulationRun";
import type { SimulationMetrics, SimulationResult, SimulationRunStatus } from "./simulator-types.ts";

export async function createSimulationRun(input: { simulationRunId: string; dropId: string; scenario: string; configuration: Record<string, unknown>; metrics: SimulationMetrics }) {
  return SimulationRun.create({ ...input, status: "CREATED", startedAt: null, completedAt: null, errorSummary: null });
}
export async function updateSimulationRun(simulationRunId: string, update: { status?: SimulationRunStatus; metrics?: SimulationMetrics; startedAt?: Date | null; completedAt?: Date | null; errorSummary?: string | null }) {
  return SimulationRun.findOneAndUpdate({ simulationRunId }, { $set: update }, { new: true }).lean();
}
export async function completeSimulationRun(result: SimulationResult) {
  return updateSimulationRun(result.simulationRunId, { status: result.status, metrics: result.metrics, startedAt: new Date(result.startedAt), completedAt: new Date(result.completedAt), errorSummary: result.errorSummary });
}
export async function getSimulationRun(simulationRunId: string) { return SimulationRun.findOne({ simulationRunId }).lean(); }
export async function listSimulationRuns(limit = 20) { return SimulationRun.find().sort({ createdAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean(); }
