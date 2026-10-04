import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import { stopSimulation } from "@/lib/simulator/simulator-service";
export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const stopped = await stopSimulation((await params).runId);
  return stopped ? Response.json({ success: true }, { status: 202 }) : Response.json({ error: "RUN_NOT_ACTIVE" }, { status: 409 });
}
