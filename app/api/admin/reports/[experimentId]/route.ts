import { auth } from "@clerk/nextjs/server";
import { isFairDropAdmin } from "@/lib/admin-auth";
import { ReportError } from "@/lib/reports/report-engine.ts";
import { reportErrorResponse } from "@/lib/reports/report-http.ts";
import { getExperimentReport } from "@/lib/reports/report-service.ts";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ experimentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!isFairDropAdmin(userId)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    return Response.json({ report: await getExperimentReport((await params).experimentId) });
  } catch (error) {
    if (error instanceof ReportError) { const response = reportErrorResponse(error); return Response.json(response.body, { status: response.status }); }
    console.error("Report generation failed");
    const response = reportErrorResponse(error); return Response.json(response.body, { status: response.status });
  }
}
