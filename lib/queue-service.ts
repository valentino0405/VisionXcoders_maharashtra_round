import "server-only";

import { randomUUID } from "node:crypto";

import { getFairDropEnvironment } from "@/lib/drop-engine";
import {
  enterQueue,
  queueEntryKey,
  queueOrderKey,
  queueSequenceKey,
  type QueueState,
} from "@/lib/queue-engine";
import { getRedisClient } from "@/lib/redis";
import Drop from "@/models/Drop";
import Participation from "@/models/Participation";
import QueueEntry, { type IQueueEntry } from "@/models/QueueEntry";

const RESERVE_QUEUE_ENTRY_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return redis.call("HMGET", KEYS[1], "queueEntryId", "dropId", "participantId", "sequence", "status", "joinedAt")
end

local sequence = redis.call("INCR", KEYS[2])
redis.call("HSET", KEYS[1],
  "queueEntryId", ARGV[1],
  "dropId", ARGV[2],
  "participantId", ARGV[3],
  "sequence", sequence,
  "status", "WAITING",
  "joinedAt", ARGV[4]
)

return {ARGV[1], ARGV[2], ARGV[3], tostring(sequence), "WAITING", ARGV[4]}
`;

export class QueueUnavailableError extends Error {
  constructor() {
    super("QUEUE_UNAVAILABLE");
    this.name = "QueueUnavailableError";
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function toQueueState(entry: IQueueEntry): QueueState {
  return {
    queueEntryId: entry.queueEntryId,
    dropId: entry.dropId,
    participantId: entry.participantId,
    sequence: entry.sequence,
    position: entry.sequence,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
  };
}

function parseRedisQueueState(values: unknown[]): QueueState {
  if (values.length !== 6 || values.some((value) => value === null || value === undefined)) {
    throw new QueueUnavailableError();
  }

  const sequence = Number(values[3]);
  const status = values[4];

  if (!Number.isSafeInteger(sequence) || sequence < 1 || (status !== "WAITING" && status !== "ACTIVE")) {
    throw new QueueUnavailableError();
  }

  return {
    queueEntryId: String(values[0]),
    dropId: String(values[1]),
    participantId: String(values[2]),
    sequence,
    position: sequence,
    status,
    joinedAt: String(values[5]),
  };
}

function parseRedisHash(value: Record<string, unknown> | null): QueueState | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }

  return parseRedisQueueState([
    value.queueEntryId,
    value.dropId,
    value.participantId,
    value.sequence,
    value.status,
    value.joinedAt,
  ]);
}

async function reserveQueueEntry(input: {
  dropId: string;
  participantId: string;
  queueEntryId: string;
  joinedAt: string;
}): Promise<QueueState> {
  const environment = getFairDropEnvironment();
  const redis = getRedisClient();

  try {
    const values = await redis.eval<string[], unknown[]>(
      RESERVE_QUEUE_ENTRY_SCRIPT,
      [
        queueEntryKey(environment, input.dropId, input.participantId),
        queueSequenceKey(environment, input.dropId),
      ],
      [input.queueEntryId, input.dropId, input.participantId, input.joinedAt]
    );

    return parseRedisQueueState(values);
  } catch (error) {
    if (error instanceof QueueUnavailableError) {
      throw error;
    }

    throw new QueueUnavailableError();
  }
}

async function persistQueueEntry(input: QueueState & { clerkId: string }) {
  const filter = { dropId: input.dropId, participantId: input.participantId };
  const MAX_SEQUENCE_RETRIES = 3;

  let currentSequence = input.sequence;

  for (let attempt = 0; attempt <= MAX_SEQUENCE_RETRIES; attempt++) {
    try {
      const result = await QueueEntry.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            queueEntryId: input.queueEntryId,
            clerkId: input.clerkId,
            sequence: currentSequence,
            status: input.status,
            joinedAt: new Date(input.joinedAt),
          },
        },
        {
          includeResultMetadata: true,
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        }
      );

      if (!result.value) {
        throw new Error("Queue entry upsert returned no document");
      }

      return {
        queue: toQueueState(result.value),
        created: result.lastErrorObject?.updatedExisting === false,
      };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      // If this participant already has an entry (collision on dropId+participantId),
      // return it as a duplicate.
      const existing = await QueueEntry.findOne(filter);

      if (existing) {
        return { queue: toQueueState(existing), created: false };
      }

      // Collision was on the (dropId, sequence) index — a different participant
      // grabbed this sequence. Retry with the next sequence number.
      if (attempt < MAX_SEQUENCE_RETRIES) {
        currentSequence++;
        continue;
      }

      throw error;
    }
  }

  // TypeScript: unreachable, but satisfies the return type.
  throw new Error("Queue entry persist exhausted retries");
}

export async function finalizeQueueEntry(queue: QueueState): Promise<number> {
  const environment = getFairDropEnvironment();
  const redis = getRedisClient();

  try {
    const results = await redis
      .multi()
      .hset(queueEntryKey(environment, queue.dropId, queue.participantId), queue)
      .zadd(queueOrderKey(environment, queue.dropId), {
        score: queue.sequence,
        member: queue.participantId,
      })
      .zcard(queueOrderKey(environment, queue.dropId))
      .exec();

    const totalQueued = Number(results.at(-1));
    if (!Number.isSafeInteger(totalQueued) || totalQueued < 1) {
      throw new QueueUnavailableError();
    }
    return totalQueued;
  } catch {
    throw new QueueUnavailableError();
  }
}

export async function enterQueueForUser(dropId: string, clerkId: string) {
  return enterQueue(dropId, clerkId, {
    getDrop: async (requestedDropId) => {
      const drop = await Drop.findOne({ dropId: requestedDropId }).lean();
      return drop
        ? { status: drop.status, startsAt: drop.startsAt, endsAt: drop.endsAt }
        : null;
    },
    getParticipant: async (requestedDropId, requestedClerkId) => {
      const participant = await Participation.findOne({
        dropId: requestedDropId,
        clerkId: requestedClerkId,
      }).lean();
      return participant ? { participantId: participant.participantId } : null;
    },
    getQueueEntry: async (requestedDropId, participantId) => {
      const entry = await QueueEntry.findOne({
        dropId: requestedDropId,
        participantId,
      });
      return entry ? toQueueState(entry) : null;
    },
    reserveQueueEntry,
    persistQueueEntry,
    finalizeQueueEntry,
    createQueueEntryId: () => `q_${randomUUID().replaceAll("-", "")}`,
  });
}

export async function getQueueStatusForUser(dropId: string, clerkId: string) {
  const drop = await Drop.findOne({ dropId }).lean();

  if (!drop) {
    return { error: "DROP_NOT_FOUND" as const };
  }

  const now = new Date();
  if (
    drop.status !== "ACTIVE" ||
    drop.startsAt.getTime() > now.getTime() ||
    (drop.endsAt !== null && drop.endsAt.getTime() <= now.getTime())
  ) {
    return { error: "DROP_NOT_ACTIVE" as const };
  }

  const participant = await Participation.findOne({ dropId, clerkId }).lean();

  if (!participant) {
    return { error: "NOT_A_PARTICIPANT" as const };
  }

  const environment = getFairDropEnvironment();
  const redis = getRedisClient();
  let queue: QueueState | null;

  try {
    const cached = await redis.hgetall<Record<string, unknown>>(
      queueEntryKey(environment, dropId, participant.participantId)
    );
    queue = parseRedisHash(cached);
  } catch (error) {
    if (error instanceof QueueUnavailableError) {
      throw error;
    }
    throw new QueueUnavailableError();
  }

  if (!queue) {
    const durableEntry = await QueueEntry.findOne({
      dropId,
      participantId: participant.participantId,
    });

    if (!durableEntry) {
      return { queued: false as const };
    }

    queue = toQueueState(durableEntry);
  }

  // Queue status is read-heavy. The former implementation repaired the Redis
  // mirror on every poll (HSET + ZADD + ZCARD), which made normal status
  // polling write traffic. Repair only when the ordering mirror is missing.
  let totalQueued: number;
  try {
    totalQueued = await redis.zcard(queueOrderKey(environment, dropId));
  } catch {
    throw new QueueUnavailableError();
  }
  if (totalQueued < queue.sequence) {
    totalQueued = await finalizeQueueEntry(queue);
  }
  return { queued: true as const, queue, totalQueued };
}
