import type { AbuseDecision } from "@/lib/abuse-engine";

export function abuseEnforcementResponse(decision: AbuseDecision): Response | null {
  if (decision.classification === "BLOCKED") {
    return Response.json(
      { error: "ACCESS_BLOCKED", classification: "BLOCKED" },
      { status: 403 }
    );
  }

  if (decision.classification === "THROTTLED") {
    const retryAfterSeconds = decision.retryAfterSeconds ?? 1;
    return Response.json(
      {
        error: "RATE_LIMITED",
        classification: "THROTTLED",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  return null;
}
