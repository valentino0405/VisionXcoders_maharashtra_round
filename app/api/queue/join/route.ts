import { auth } from "@clerk/nextjs/server";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import { parseDropJoinRequest } from "@/lib/drop-engine";
import connectToDatabase from "@/lib/mongodb";
import { QueueEngineError } from "@/lib/queue-engine";
import { QueueUnavailableError, enterQueueForUser } from "@/lib/queue-service";
import { getQueueTokenSecret, issueQueueToken } from "@/lib/queue-token";
import QueueEntry from "@/models/QueueEntry";

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
      action: "QUEUE_JOIN",
      endpoint: "/api/queue/join",
      dropId: input?.dropId,
    });
    const enforcement = abuseEnforcementResponse(abuseDecision);

    if (enforcement) {
      return enforcement;
    }

    if (!input) {
      const invalidDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "QUEUE_JOIN",
        event: "INVALID_REQUEST",
        endpoint: "/api/queue/join",
      });
      const invalidEnforcement = abuseEnforcementResponse(invalidDecision);
      if (invalidEnforcement) return invalidEnforcement;
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    await connectToDatabase();
    await QueueEntry.init();

    const result = await enterQueueForUser(input.dropId, userId);

    if (!result.created) {
      const duplicateDecision = await recordAbuseEvent({
        clerkId: userId,
        action: "QUEUE_JOIN",
        event: "DUPLICATE_QUEUE_JOIN",
        endpoint: "/api/queue/join",
        dropId: input.dropId,
      });
      const duplicateEnforcement = abuseEnforcementResponse(duplicateDecision);
      if (duplicateEnforcement) return duplicateEnforcement;
    }

    const token = issueQueueToken(
      {
        dropId: result.queue.dropId,
        participantId: result.queue.participantId,
        queueEntryId: result.queue.queueEntryId,
      },
      getQueueTokenSecret()
    );

    return Response.json(
      {
        success: true,
        alreadyQueued: !result.created,
        queue: { ...result.queue, totalQueued: result.totalQueued },
        token,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof QueueEngineError) {
      const status = error.code === "DROP_NOT_FOUND" ? 404 : 409;
      return Response.json({ error: error.code }, { status });
    }

    if (error instanceof QueueUnavailableError) {
      return Response.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
    }

    console.error("Queue join failed");
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
