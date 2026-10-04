import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { evaluateAbuseRequest } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import {
  FAIR_DROP_SESSION_COOKIE,
  getSessionTtlSeconds,
  recoverSessionForUser,
} from "@/lib/session-service";
import { SessionUnavailableError } from "@/lib/session-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const decision = await evaluateAbuseRequest({
      clerkId: userId,
      action: "SESSION_RECOVERY",
      endpoint: "/api/session",
    });
    const enforcement = abuseEnforcementResponse(decision);
    if (enforcement) return enforcement;

    const cookieStore = await cookies();
    const recovered = await recoverSessionForUser(userId, cookieStore.get(FAIR_DROP_SESSION_COOKIE)?.value);
    cookieStore.set(FAIR_DROP_SESSION_COOKIE, recovered.session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getSessionTtlSeconds(),
    });

    return Response.json({
      authenticated: true,
      session: {
        activeDropId: recovered.session.activeDropId,
        status: recovered.session.status,
        expiresAt: recovered.session.expiresAt,
      },
      state: recovered.state,
    });
  } catch (error) {
    if (error instanceof SessionUnavailableError) {
      return Response.json({ error: "SESSION_UNAVAILABLE" }, { status: 503 });
    }
    console.error("Session recovery failed");
    return Response.json({ error: "SESSION_UNAVAILABLE" }, { status: 503 });
  }
}
