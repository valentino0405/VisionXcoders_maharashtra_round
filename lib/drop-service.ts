import "server-only";

import { randomUUID } from "node:crypto";

import { joinDrop, type ParticipantState } from "@/lib/drop-engine";
import { getRedisClient } from "@/lib/redis";
import Drop from "@/models/Drop";
import Participation, { type IParticipation } from "@/models/Participation";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}
function participantState(participation: IParticipation): ParticipantState {
  return { participantId: participation.participantId, dropId: participation.dropId, status: participation.status };
}
async function upsertParticipation(input: { dropId: string; clerkId: string; participantId: string; joinedAt: Date }) {
  const filter = { dropId: input.dropId, clerkId: input.clerkId };
  try {
    const result = await Participation.findOneAndUpdate(filter, { $setOnInsert: { participantId: input.participantId, joinedAt: input.joinedAt, status: "JOINED" } }, {
      includeResultMetadata: true, new: true, runValidators: true, setDefaultsOnInsert: true, upsert: true,
    });
    if (!result.value) throw new Error("Participation upsert returned no document");
    return { participant: participantState(result.value), created: result.lastErrorObject?.updatedExisting === false };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await Participation.findOne(filter);
    if (!existing) throw error;
    return { participant: participantState(existing), created: false };
  }
}

/** Shared server service; callers must supply an already authenticated Clerk identity. */
export async function joinDropForUser(dropId: string, clerkId: string) {
  return joinDrop(dropId, clerkId, {
    getDrop: async (requestedDropId) => {
      const drop = await Drop.findOne({ dropId: requestedDropId }).lean();
      return drop ? { status: drop.status, startsAt: drop.startsAt, endsAt: drop.endsAt } : null;
    },
    upsertParticipation,
    cacheParticipant: async (key, participant) => { await getRedisClient().set(key, participant); },
    createParticipantId: () => `p_${randomUUID().replaceAll("-", "")}`,
    onCacheError: () => { console.error("Redis participant state update failed"); },
  });
}
