import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import connectToDatabase from "@/lib/mongodb";
import { getExperiment } from "@/lib/experiments/experiment-store.ts";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ experimentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  await connectToDatabase();
  const experiment = await getExperiment((await params).experimentId);
  return experiment ? Response.json({ experiment }) : Response.json({ error: "EXPERIMENT_NOT_FOUND" }, { status: 404 });
}
