import { auth } from "@clerk/nextjs/server";

import connectToDatabase from "@/lib/mongodb";
import { getSimulationRun } from "@/lib/simulator/simulator-run-store";
import Drop from "@/models/Drop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId || runId.length > 120) return Response.json({ error: "INVALID_RUN" }, { status: 400 });
  await connectToDatabase();
  const run = await getSimulationRun(runId);
  if (!run || run.ownerClerkId !== userId) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const drop = await Drop.findOne({ dropId: run.dropId }).lean();
  return Response.json({
    simulationRunId: run.simulationRunId, dropId: run.dropId, status: run.status, configuration: run.configuration,
    startedAt: run.startedAt, completedAt: run.completedAt, errorSummary: run.errorSummary, capacity: drop?.capacity ?? null,
    metrics: run.metrics,
  });
}
