import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import { SimulationConfigError } from "@/lib/simulator/simulator-engine";
import { startSimulation } from "@/lib/simulator/simulator-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const result = await startSimulation(await request.json());
    return Response.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof SimulationConfigError) return Response.json({ error: "SIMULATION_LIMIT_EXCEEDED", detail: error.message }, { status: 400 });
    console.error("Simulator start failed");
    return Response.json({ error: "SIMULATION_UNAVAILABLE" }, { status: 503 });
  }
}
