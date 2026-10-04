import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import connectToDatabase from "@/lib/mongodb";
import { getSimulationRun } from "@/lib/simulator/simulator-run-store";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  await connectToDatabase();
  const run = await getSimulationRun((await params).runId);
  return run ? Response.json({ run }) : Response.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
}
