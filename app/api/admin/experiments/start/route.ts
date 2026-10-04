import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import { SimulationConfigError } from "@/lib/simulator/simulator-engine.ts";
import { startExperiment } from "@/lib/experiments/experiment-service.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    return Response.json(await startExperiment(await request.json()), { status: 202 });
  } catch (error) {
    if (error instanceof SimulationConfigError || (error instanceof Error && error.message.startsWith("Experiment name"))) return Response.json({ error: "INVALID_EXPERIMENT", detail: error.message }, { status: 400 });
    console.error("Experiment start failed");
    return Response.json({ error: "EXPERIMENT_UNAVAILABLE" }, { status: 503 });
  }
}
