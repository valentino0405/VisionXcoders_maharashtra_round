import { auth } from "@clerk/nextjs/server";
import { resetLiveDemoSimulation } from "@/lib/simulator/simulator-service";
export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function POST(request: Request) { const { userId } = await auth(); if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 }); const { runId } = await request.json(); if (typeof runId !== "string" || runId.length > 120) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 }); const reset = await resetLiveDemoSimulation(runId, userId); return reset ? Response.json({ reset: true }) : Response.json({ error: "RUN_ACTIVE_OR_NOT_FOUND" }, { status: 409 }); }
