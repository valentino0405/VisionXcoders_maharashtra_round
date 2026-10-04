import "server-only";

import connectToDatabase from "@/lib/mongodb";
import Experiment from "@/models/Experiment";
import { generateExperimentReport, type ReportExperiment } from "./report-engine.ts";

export async function getExperimentReport(experimentId: string) {
  await connectToDatabase();
  const experiment = await Experiment.findOne({ experimentId }).lean();
  return generateExperimentReport(experiment as unknown as ReportExperiment | null);
}
