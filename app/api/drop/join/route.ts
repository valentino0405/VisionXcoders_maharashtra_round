import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";

import { evaluateAbuseRequest, recordAbuseEvent } from "@/lib/abuse-engine";
import { abuseEnforcementResponse } from "@/lib/abuse-http";
import {
  DropEngineError,
  joinDrop,
  parseDropJoinRequest,
  type ParticipantState,
} from "@/lib/drop-engine";
import connectToDatabase from "@/lib/mongodb";
import { getRedisClient } from "@/lib/redis";
import Drop from "@/models/Drop";
import Participation, { type IParticipation } from "@/models/Participation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function toParticipantState(participation: IParticipation): ParticipantState {
  return {
    participantId: participation.participantId,
    dropId: participation.dropId,
    status: participation.status,
  };
}

async function upsertParticipation(input: {
  dropId: string;
  clerkId: string;
  participantId: string;
  joinedAt: Date;
}) {
  const filter = { dropId: input.dropId, clerkId: input.clerkId };

  try {
    const result = await Participation.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          participantId: input.participantId,
          joinedAt: input.joinedAt,
          status: "JOINED",
        },
      },
      {
        includeResultMetadata: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        upsert: true,
      }
    );

    if (!result.value) {
      throw new Error("Participation upsert returned no document");
    }

    return {
      participant: toParticipantState(result.value),
      created: result.lastErrorObject?.updatedExisting === false,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existingParticipation = await Participation.findOne(filter);

    if (!existingParticipation) {
      throw error;
    }

    return {
      participant: toParticipantState(existingParticipation),
      created: false,
    };
  }
}

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

    const result = await joinDrop(input.dropId, userId, {
      getDrop: async (dropId) => {
        const drop = await Drop.findOne({ dropId }).lean();

        if (!drop) {
          return null;
        }

        return {
          status: drop.status,
          startsAt: drop.startsAt,
          endsAt: drop.endsAt,
        };
      },
      upsertParticipation,
      cacheParticipant: async (key, participant) => {
        const redis = getRedisClient();
        await redis.set(key, participant);
      },
      createParticipantId: () => `p_${randomUUID().replaceAll("-", "")}`,
      onCacheError: () => {
        console.error("Redis participant state update failed");
      },
    });

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
