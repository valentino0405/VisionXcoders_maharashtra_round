import { auth } from "@clerk/nextjs/server";

import { resolveLiveScenario } from "@/lib/live-demo";
import { startLiveDemoSimulation } from "@/lib/simulator/simulator-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const input = resolveLiveScenario(await request.json());
    if (!input) return Response.json({ error: "INVALID_PRESET" }, { status: 400 });
    const run = await startLiveDemoSimulation(input.config, userId, input.capacity, input.preloadedAllocated);
    return Response.json({ ...run, scenario: input }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start live demo";
    return Response.json({ error: "DEMO_START_FAILED", message }, { status: 503 });
  }
}
