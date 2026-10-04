import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import { stopExperiment } from "@/lib/experiments/experiment-service.ts";

export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ experimentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  return await stopExperiment((await params).experimentId) ? Response.json({ success: true }, { status: 202 }) : Response.json({ error: "EXPERIMENT_NOT_ACTIVE" }, { status: 409 });
}
