import "server-only";

import { randomUUID } from "node:crypto";

import connectToDatabase from "@/lib/mongodb";
import { runBaselineSimulation } from "./baseline-engine.ts";
import { compareExperimentMetrics } from "./experiment-comparison.ts";
import { createExperiment, updateExperiment } from "./experiment-store.ts";
import { emptySimulationMetrics } from "@/lib/simulator/simulator-metrics.ts";
import { completeSimulationRun, createSimulationRun, updateSimulationRun } from "@/lib/simulator/simulator-run-store.ts";
import { validateSimulationConfig } from "@/lib/simulator/simulator-engine.ts";
import { runFairDropSimulation } from "@/lib/simulator/simulator-service.ts";
import type { SimulationConfig } from "@/lib/simulator/simulator-types.ts";

const activeExperiments = new Map<string, { cancelled: boolean }>();
type ExperimentInput = SimulationConfig & { name: string };

function id(prefix: string) { return `${prefix}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}_${randomUUID().slice(0, 8)}`; }
function dropId(experimentId: string) { return `fairdrop-exp-${experimentId.toLowerCase().replaceAll("_", "-").slice(-40)}`; }

async function executeExperiment(run: { experimentId: string; name: string; config: ReturnType<typeof validateSimulationConfig>; baselineRunId: string; fairDropRunId: string; control: { cancelled: boolean } }) {
  try {
    await updateExperiment(run.experimentId, { status: "RUNNING_BASELINE", startedAt: new Date() });
    await createSimulationRun({ simulationRunId: run.baselineRunId, dropId: `baseline-${run.experimentId}`, scenario: run.config.scenario, configuration: run.config, metrics: emptySimulationMetrics(run.config.virtualUsers) });
    await updateSimulationRun(run.baselineRunId, { status: "RUNNING", startedAt: new Date() });
    const baseline = await runBaselineSimulation(run.baselineRunId, `baseline-${run.experimentId}`, run.config, run.control, async (metrics) => {
      await updateSimulationRun(run.baselineRunId, { status: run.control.cancelled ? "STOPPING" : "RUNNING", metrics });
      await updateExperiment(run.experimentId, { baselineMetrics: metrics });
    });
    await completeSimulationRun(baseline);
    await updateExperiment(run.experimentId, { baselineMetrics: baseline.metrics });
    if (run.control.cancelled) {
      await updateExperiment(run.experimentId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    await updateExperiment(run.experimentId, { status: "RUNNING_FAIRDROP" });
    const isolatedDropId = dropId(run.experimentId);
    await createSimulationRun({ simulationRunId: run.fairDropRunId, dropId: isolatedDropId, scenario: run.config.scenario, configuration: run.config, metrics: emptySimulationMetrics(run.config.virtualUsers) });
    await updateSimulationRun(run.fairDropRunId, { status: "RUNNING", startedAt: new Date() });
    const fairDrop = await runFairDropSimulation(run.fairDropRunId, isolatedDropId, run.config, run.control, async (metrics) => {
      await updateSimulationRun(run.fairDropRunId, { status: run.control.cancelled ? "STOPPING" : "RUNNING", metrics });
      await updateExperiment(run.experimentId, { fairDropMetrics: metrics });
    });
    await completeSimulationRun(fairDrop);
    await updateExperiment(run.experimentId, { fairDropMetrics: fairDrop.metrics });
    if (run.control.cancelled) {
      await updateExperiment(run.experimentId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    await updateExperiment(run.experimentId, { status: "COMPARING" });
    const comparison = compareExperimentMetrics(baseline.metrics, fairDrop.metrics);
    await updateExperiment(run.experimentId, { status: "COMPLETED", comparison, completedAt: new Date() });
  } catch (error) {
    await updateExperiment(run.experimentId, { status: run.control.cancelled ? "CANCELLED" : "FAILED", completedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 500) : "Unexpected experiment failure" });
  } finally {
    activeExperiments.delete(run.experimentId);
  }
}

export async function startExperiment(input: ExperimentInput) {
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) throw new Error("Experiment name must contain 1 to 100 characters");
  const config = validateSimulationConfig(input);
  await connectToDatabase();
  const experimentId = id("exp");
  const baselineRunId = `${experimentId}_baseline`;
  const fairDropRunId = `${experimentId}_fairdrop`;
  const control = { cancelled: false };
  activeExperiments.set(experimentId, control);
  await createExperiment({ experimentId, name: input.name.trim(), scenario: config.scenario, configuration: config, seed: config.seed, baselineRunId, fairDropRunId });
  void executeExperiment({ experimentId, name: input.name.trim(), config, baselineRunId, fairDropRunId, control });
  return { experimentId, baselineRunId, fairDropRunId, status: "CREATED" as const };
}

export async function stopExperiment(experimentId: string) {
  const control = activeExperiments.get(experimentId);
  if (!control) return false;
  control.cancelled = true;
  return true;
}
