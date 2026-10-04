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

  const [drop, queue, allocation] = await Promise.all([
    Drop.findOne({ dropId: participation.dropId }).lean(),
    QueueEntry.findOne({
      dropId: participation.dropId,
      participantId: participation.participantId,
    }).lean(),
    Allocation.findOne({
      dropId: participation.dropId,
      participantId: participation.participantId,
    }).lean(),
  ]);

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

  // Obtain the Redis client if it is configured. Redis is used only as a
  // session cache — the authoritative state lives in MongoDB. If Redis is
  // unavailable or unconfigured we degrade gracefully: readSession returns
  // null (no cached session) and writeSession is a no-op. This mirrors the
  // fail-open behaviour of the abuse engine.
  let redis: ReturnType<typeof getRedisClient> | null = null;
  try {
    redis = getRedisClient();
  } catch {
    console.warn(
      "[FairDrop] Redis client unavailable for session service; " +
        "session will be recovered from MongoDB without caching.",
    );
  }

  try {
    await connectToDatabase();
    return await recoverSessionState(
      { clerkId, sessionId, ttlSeconds },
      {
        readSession: async (requestedSessionId) => {
          if (!redis) return null;
          try {
            const value = await redis.get<unknown>(sessionRedisKey(environment, requestedSessionId));
            return isStoredSession(value) ? value : null;
          } catch {
            // Redis is temporarily unavailable. Fall through to a full
            // MongoDB state recovery — authoritative, slightly slower.
            console.warn(
              "[FairDrop] Redis read failed during session recovery; " +
                "recovering authoritative state from MongoDB.",
            );
            return null;
          }
        },
        writeSession: async (session, ttl) => {
          if (!redis) return;
          try {
            await redis.set(
              sessionRedisKey(environment, session.sessionId),
              session,
              { ex: ttl },
            );
          } catch {
            // Session caching failed. The user's state is already returned
            // from MongoDB; not caching only affects performance of the next
            // request, not correctness.
            console.warn(
              "[FairDrop] Redis write failed during session caching; " +
                "session state will not be cached this request.",
            );
          }
        },
        recoverAuthoritativeState,
        createSessionId: () => `fs_${randomUUID().replaceAll("-", "")}`,
      }
    );
  } catch (error) {
    if (error instanceof SessionUnavailableError) throw error;
    // MongoDB failure — this is genuinely unavailable.
    console.error("[FairDrop] Session recovery failed (MongoDB may be unavailable)", error instanceof Error ? error.message : error);
    throw new SessionUnavailableError();
  }
}
