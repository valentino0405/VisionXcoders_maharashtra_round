import { auth } from "@clerk/nextjs/server";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import { DropEngineError, parseDropJoinRequest } from "@/lib/drop-engine";
import { joinDropForUser } from "@/lib/drop-service";
import connectToDatabase from "@/lib/mongodb";
import Participation from "@/models/Participation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const input = parseDropJoinRequest(body);
    const abuseDecision = await evaluateAbuseRequest({
      clerkId: userId,
      action: "DROP_JOIN",
      endpoint: "/api/drop/join",
      dropId: input?.dropId,
    });
    const enforcement = abuseEnforcementResponse(abuseDecision);

    if (enforcement) {
      return enforcement;
    }

    if (!input) {
      const invalidDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "DROP_JOIN",
        event: "INVALID_REQUEST",
        endpoint: "/api/drop/join",
      });
      const invalidEnforcement = abuseEnforcementResponse(invalidDecision);
      if (invalidEnforcement) return invalidEnforcement;
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    await connectToDatabase();
    await Participation.init();

    const result = await joinDropForUser(input.dropId, userId);

    if (!result.created) {
      const duplicateDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "DROP_JOIN",
        event: "DUPLICATE_DROP_JOIN",
        endpoint: "/api/drop/join",
        dropId: input.dropId,
      });
      const duplicateEnforcement = abuseEnforcementResponse(duplicateDecision);
      if (duplicateEnforcement) return duplicateEnforcement;
    }

    return Response.json(
      {
        success: true,
        alreadyJoined: !result.created,
        participant: result.participant,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof DropEngineError) {
      const status = error.code === "DROP_NOT_FOUND" ? 404 : 409;
      return Response.json({ error: error.code }, { status });
    }

    console.error("Drop join failed");
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
