import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import connectToDatabase from "@/lib/mongodb";
import { listSimulationRuns } from "@/lib/simulator/simulator-run-store";
export const dynamic = "force-dynamic";
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  await connectToDatabase();
  return Response.json({ runs: await listSimulationRuns() });
}
