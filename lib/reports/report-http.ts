import { ReportError } from "./report-engine.ts";

export function reportErrorResponse(error: unknown) {
  if (error instanceof ReportError) return { status: error.code === "REPORT_NOT_FOUND" ? 404 : 409, body: { error: error.code, detail: error.message } };
  return { status: 503, body: { error: "REPORT_UNAVAILABLE" } };
}
