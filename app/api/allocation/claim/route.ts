import { auth } from "@clerk/nextjs/server";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import { AllocationEngineError } from "@/lib/allocation-engine";
import { AllocationUnavailableError, claimAllocationForUser } from "@/lib/allocation-service";
import { parseDropJoinRequest } from "@/lib/drop-engine";
import connectToDatabase from "@/lib/mongodb";
import Allocation from "@/models/Allocation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    const input = parseDropJoinRequest(body);
    const abuseDecision = await evaluateAbuseRequest({
      clerkId: userId, action: "ALLOCATION_CLAIM", endpoint: "/api/allocation/claim", dropId: input?.dropId,
    });
    const enforcement = abuseEnforcementResponse(abuseDecision);
    if (enforcement) return enforcement;

    if (!input) {
      const invalidDecision = await recordAbuseEvent({
        clerkId: userId, action: "ALLOCATION_CLAIM", event: "INVALID_REQUEST", endpoint: "/api/allocation/claim",
      });
      const invalidEnforcement = abuseEnforcementResponse(invalidDecision);
      if (invalidEnforcement) return invalidEnforcement;
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    await connectToDatabase();
    await Allocation.init();
    const result = await claimAllocationForUser(input.dropId, userId);
    const { allocation } = result;
    return Response.json(
      {
        success: true,
        alreadyAllocated: !result.created,
        allocation: {
          allocationId: allocation.allocationId,
          dropId: allocation.dropId,
          queueEntryId: allocation.queueEntryId,
          queueSequence: allocation.queueSequence,
          seatId: allocation.seatId,
          status: allocation.status,
          allocatedAt: allocation.allocatedAt,
        },
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof AllocationEngineError) {
      const status = error.code === "DROP_NOT_FOUND" ? 404 : 409;
      return Response.json({ error: error.code }, { status });
    }
    if (error instanceof AllocationUnavailableError) {
      return Response.json({ error: "ALLOCATION_UNAVAILABLE" }, { status: 503 });
    }
    console.error("Allocation claim failed");
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
