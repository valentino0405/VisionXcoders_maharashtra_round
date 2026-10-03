import { auth } from "@clerk/nextjs/server";

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
    if (!input) {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    await connectToDatabase();
    await QueueEntry.init();

    const result = await enterQueueForUser(input.dropId, userId);
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
