import { auth } from "@clerk/nextjs/server";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import { parseDropJoinRequest } from "@/lib/drop-engine";
import connectToDatabase from "@/lib/mongodb";
import { QueueUnavailableError, getQueueStatusForUser } from "@/lib/queue-service";
import { getQueueTokenSecret, verifyQueueTokenDetailed } from "@/lib/queue-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = new URL(request.url);
    const input = parseDropJoinRequest({ dropId: url.searchParams.get("dropId") });
    const abuseDecision = await evaluateAbuseRequest({
      clerkId: userId,
      action: "QUEUE_STATUS",
      endpoint: "/api/queue/status",
      dropId: input?.dropId,
    });
    const enforcement = abuseEnforcementResponse(abuseDecision);

    if (enforcement) {
      return enforcement;
    }

    if (!input) {
      const invalidDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "QUEUE_STATUS",
        event: "INVALID_REQUEST",
        endpoint: "/api/queue/status",
      });
      const invalidEnforcement = abuseEnforcementResponse(invalidDecision);
      if (invalidEnforcement) return invalidEnforcement;
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    await connectToDatabase();
    const result = await getQueueStatusForUser(input.dropId, userId);

    if ("error" in result) {
      const status = result.error === "DROP_NOT_FOUND" ? 404 : 409;
      return Response.json({ error: result.error }, { status });
    }

    if (!result.queued) {
      return Response.json({ success: true, queued: false });
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const verification = verifyQueueTokenDetailed(
      token,
      {
        dropId: result.queue.dropId,
        participantId: result.queue.participantId,
        queueEntryId: result.queue.queueEntryId,
      },
      getQueueTokenSecret()
    );

    if (!verification.valid) {
      const event =
        verification.reason === "CROSS_DROP"
          ? "CROSS_DROP_TOKEN"
          : verification.reason === "CROSS_PARTICIPANT" ||
              verification.reason === "CROSS_QUEUE_ENTRY"
            ? "CROSS_PARTICIPANT_TOKEN"
            : "INVALID_QUEUE_TOKEN";
      const tokenDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "QUEUE_STATUS",
        event,
        endpoint: "/api/queue/status",
        dropId: input.dropId,
      });
      const tokenEnforcement = abuseEnforcementResponse(tokenDecision);
      if (tokenEnforcement) return tokenEnforcement;
      return Response.json({ error: "INVALID_QUEUE_TOKEN" }, { status: 401 });
    }

    return Response.json({
      success: true,
      queued: true,
      queue: { ...result.queue, totalQueued: result.totalQueued },
    });
  } catch (error) {
    if (error instanceof QueueUnavailableError) {
      return Response.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
    }

    console.error("Queue status failed");
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
