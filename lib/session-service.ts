import "server-only";

import { randomUUID } from "node:crypto";

import {
  recoverSessionState,
  SessionUnavailableError,
  type FairDropSession,
  type RecoveredFairDropState,
} from "@/lib/session-engine";
import { getFairDropEnvironment } from "@/lib/drop-engine";
import connectToDatabase from "@/lib/mongodb";
import { getRedisClient } from "@/lib/redis";
import Allocation from "@/models/Allocation";
import Drop from "@/models/Drop";
import Participation from "@/models/Participation";
import QueueEntry from "@/models/QueueEntry";

const DEFAULT_SESSION_TTL_SECONDS = 30 * 60;

export const FAIR_DROP_SESSION_COOKIE = "fairdrop_session";

export function getSessionTtlSeconds(): number {
  const configured = process.env.FAIRDROP_SESSION_TTL_SECONDS;
  if (configured === undefined || configured === "") return DEFAULT_SESSION_TTL_SECONDS;
  const parsed = Number(configured);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 24 * 60 * 60) {
    throw new SessionUnavailableError();
  }
  return parsed;
}

export function sessionRedisKey(environment: string, sessionId: string): string {
  return `fairdrop:${environment}:session:${sessionId}`;
}

function isStoredSession(value: unknown): value is FairDropSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<FairDropSession>;
  return (
    typeof session.sessionId === "string" &&
    typeof session.clerkId === "string" &&
    (typeof session.activeDropId === "string" || session.activeDropId === null) &&
    (typeof session.participantId === "string" || session.participantId === null) &&
    (typeof session.queueEntryId === "string" || session.queueEntryId === null) &&
    (typeof session.allocationId === "string" || session.allocationId === null) &&
    session.status === "ACTIVE" &&
    typeof session.createdAt === "string" &&
    typeof session.lastSeenAt === "string" &&
    typeof session.expiresAt === "string"
  );
}

async function recoverAuthoritativeState(
  clerkId: string,
  preferredDropId: string | null
): Promise<RecoveredFairDropState> {
  let participation = preferredDropId
    ? await Participation.findOne({ clerkId, dropId: preferredDropId }).lean()
    : null;
  if (!participation) {
    participation = await Participation.findOne({ clerkId }).sort({ joinedAt: -1 }).lean();
  }

  if (!participation) {
    return { activeDropId: null, drop: null, participation: null, queue: null, allocation: null };
  }

  const drop = await Drop.findOne({ dropId: participation.dropId }).lean();
  const queue = await QueueEntry.findOne({
    dropId: participation.dropId,
    participantId: participation.participantId,
  }).lean();
  const allocation = await Allocation.findOne({
    dropId: participation.dropId,
    participantId: participation.participantId,
  }).lean();

  // Linked records must agree with the durable participant/queue identity before exposure.
  const consistentQueue = queue && queue.participantId === participation.participantId ? queue : null;
  const consistentAllocation =
    allocation &&
    consistentQueue &&
    allocation.participantId === participation.participantId &&
    allocation.queueEntryId === consistentQueue.queueEntryId
      ? allocation
      : null;

  return {
    activeDropId: drop ? drop.dropId : null,
    drop: { dropId: participation.dropId, status: drop?.status ?? null, exists: Boolean(drop) },
    participation: {
      participantId: participation.participantId,
      dropId: participation.dropId,
      joinedAt: participation.joinedAt.toISOString(),
    },
    queue: consistentQueue
      ? {
          queueEntryId: consistentQueue.queueEntryId,
          sequence: consistentQueue.sequence,
          position: consistentQueue.sequence,
          status: consistentQueue.status,
          joinedAt: consistentQueue.joinedAt.toISOString(),
        }
      : null,
    allocation: consistentAllocation
      ? {
          allocationId: consistentAllocation.allocationId,
          queueEntryId: consistentAllocation.queueEntryId,
          queueSequence: consistentAllocation.queueSequence,
          seatId: consistentAllocation.seatId,
          status: consistentAllocation.status,
          allocatedAt: consistentAllocation.allocatedAt.toISOString(),
        }
      : null,
  };
}

export async function recoverSessionForUser(clerkId: string, sessionId?: string | null) {
  const environment = getFairDropEnvironment();
  const ttlSeconds = getSessionTtlSeconds();
  const redis = getRedisClient();

  try {
    await connectToDatabase();
    return await recoverSessionState(
      { clerkId, sessionId, ttlSeconds },
      {
        readSession: async (requestedSessionId) => {
          const value = await redis.get<unknown>(sessionRedisKey(environment, requestedSessionId));
          return isStoredSession(value) ? value : null;
        },
        writeSession: async (session, ttl) => {
          await redis.set(sessionRedisKey(environment, session.sessionId), session, { ex: ttl });
        },
        recoverAuthoritativeState,
        createSessionId: () => `fs_${randomUUID().replaceAll("-", "")}`,
      }
    );
  } catch (error) {
    if (error instanceof SessionUnavailableError) throw error;
    // Both MongoDB and Redis failures are intentionally presented as one safe temporary error.
    throw new SessionUnavailableError();
  }
}
