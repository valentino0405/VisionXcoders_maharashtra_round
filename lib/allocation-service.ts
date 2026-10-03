import "server-only";

import {
  AllocationEngineError,
  claimAllocation,
  type AllocationReservation,
  type AllocationState,
} from "@/lib/allocation-engine";
import { getFairDropEnvironment } from "@/lib/drop-engine";
import { getRedisClient } from "@/lib/redis";
import Allocation, { type IAllocation } from "@/models/Allocation";
import Drop from "@/models/Drop";
import Participation from "@/models/Participation";
import QueueEntry from "@/models/QueueEntry";

const RESERVE_ALLOCATION_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return {"EXISTING", unpack(redis.call("HMGET", KEYS[1], "allocationId", "dropId", "participantId", "queueEntryId", "queueSequence", "seatId", "status", "allocatedAt"))}
end

if tonumber(ARGV[5]) > tonumber(ARGV[8]) then
  return {"NOT_ELIGIBLE"}
end

if redis.call("EXISTS", KEYS[2]) == 1 then
  return {"CONFLICT"}
end

redis.call("HSET", KEYS[1], "allocationId", ARGV[1], "dropId", ARGV[2], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "PENDING_PERSISTENCE", "allocatedAt", ARGV[7])
redis.call("HSET", KEYS[2], "allocationId", ARGV[1], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "PENDING_PERSISTENCE")
return {"RESERVED", ARGV[1], ARGV[2], ARGV[3], ARGV[4], ARGV[5], ARGV[6], "PENDING_PERSISTENCE", ARGV[7]}
`;

const FINALIZE_ALLOCATION_SCRIPT = `
local participant = redis.call("HMGET", KEYS[1], "allocationId", "participantId", "seatId")
if participant[1] and (participant[1] ~= ARGV[1] or participant[2] ~= ARGV[3] or participant[3] ~= ARGV[6]) then return {"CONFLICT"} end
local seat = redis.call("HMGET", KEYS[2], "allocationId", "participantId", "seatId")
if seat[1] and (seat[1] ~= ARGV[1] or seat[2] ~= ARGV[3] or seat[3] ~= ARGV[6]) then return {"CONFLICT"} end
redis.call("HSET", KEYS[1], "allocationId", ARGV[1], "dropId", ARGV[2], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "ALLOCATED", "allocatedAt", ARGV[7])
redis.call("HSET", KEYS[2], "allocationId", ARGV[1], "participantId", ARGV[3], "queueEntryId", ARGV[4], "queueSequence", ARGV[5], "seatId", ARGV[6], "status", "ALLOCATED")
return {"OK"}
`;

export class AllocationUnavailableError extends Error {
  constructor() {
    super("ALLOCATION_UNAVAILABLE");
    this.name = "AllocationUnavailableError";
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

function toAllocationState(allocation: IAllocation | { [key: string]: unknown }): AllocationState {
  const queueSequence = Number(allocation.queueSequence);
  const allocatedAt = allocation.allocatedAt instanceof Date ? allocation.allocatedAt.toISOString() : String(allocation.allocatedAt);
  if (!Number.isSafeInteger(queueSequence) || queueSequence < 1 || !allocation.allocationId || !allocation.seatId) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }
  return {
    allocationId: String(allocation.allocationId), dropId: String(allocation.dropId), participantId: String(allocation.participantId),
    clerkId: String(allocation.clerkId ?? ""), queueEntryId: String(allocation.queueEntryId), queueSequence,
    seatId: String(allocation.seatId), status: "ALLOCATED", allocatedAt,
  };
}

export function allocationParticipantKey(environment: string, dropId: string, participantId: string): string {
  return `fairdrop:${environment}:allocation:participant:${dropId}:${participantId}`;
}

export function allocationSeatKey(environment: string, dropId: string, seatId: string): string {
  return `fairdrop:${environment}:allocation:seat:${dropId}:${seatId}`;
}

function parseReservation(values: unknown[], expected: AllocationState): AllocationReservation {
  const state = String(values[0] ?? "");
  if (state === "NOT_ELIGIBLE") return { kind: "NOT_ELIGIBLE" };
  if (state === "CONFLICT") return { kind: "CONFLICT" };
  if (state !== "RESERVED" && state !== "EXISTING") throw new AllocationUnavailableError();
  if (values.length !== 9 || values.slice(1).some((value) => value === null || value === undefined)) {
    throw new AllocationUnavailableError();
  }
  const allocation = toAllocationState({
    allocationId: values[1], dropId: values[2], participantId: values[3], queueEntryId: values[4],
    queueSequence: values[5], seatId: values[6], allocatedAt: values[8], clerkId: expected.clerkId,
  });
  return { kind: state, allocation };
}

async function reserveAllocation(allocation: AllocationState, capacity: number): Promise<AllocationReservation> {
  const environment = getFairDropEnvironment();
  try {
    const values = await getRedisClient().eval<unknown[], unknown[]>(
      RESERVE_ALLOCATION_SCRIPT,
      [
        allocationParticipantKey(environment, allocation.dropId, allocation.participantId),
        allocationSeatKey(environment, allocation.dropId, allocation.seatId),
      ],
      [allocation.allocationId, allocation.dropId, allocation.participantId, allocation.queueEntryId, allocation.queueSequence, allocation.seatId, allocation.allocatedAt, capacity]
    );
    return parseReservation(values, allocation);
  } catch (error) {
    if (error instanceof AllocationUnavailableError) throw error;
    throw new AllocationUnavailableError();
  }
}

async function persistAllocation(allocation: AllocationState): Promise<{ allocation: AllocationState; created: boolean }> {
  const filter = { dropId: allocation.dropId, participantId: allocation.participantId };
  try {
    const result = await Allocation.findOneAndUpdate(
      filter,
      { $setOnInsert: { ...allocation, allocatedAt: new Date(allocation.allocatedAt) } },
      { includeResultMetadata: true, new: true, runValidators: true, setDefaultsOnInsert: true, upsert: true }
    );
    if (!result.value) throw new Error("Allocation upsert returned no document");
    return { allocation: toAllocationState(result.value), created: result.lastErrorObject?.updatedExisting === false };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await Allocation.findOne({
      $or: [
        filter,
        { dropId: allocation.dropId, seatId: allocation.seatId },
        { dropId: allocation.dropId, queueEntryId: allocation.queueEntryId },
      ],
    });
    if (!existing) throw error;
    const durable = toAllocationState(existing);
    if (durable.participantId !== allocation.participantId || durable.seatId !== allocation.seatId || durable.queueEntryId !== allocation.queueEntryId) {
      throw new AllocationEngineError("ALLOCATION_CONFLICT");
    }
    return { allocation: durable, created: false };
  }
}

async function finalizeReservation(allocation: AllocationState): Promise<void> {
  const environment = getFairDropEnvironment();
  const values = await getRedisClient().eval<unknown[], unknown[]>(
    FINALIZE_ALLOCATION_SCRIPT,
    [
      allocationParticipantKey(environment, allocation.dropId, allocation.participantId),
      allocationSeatKey(environment, allocation.dropId, allocation.seatId),
    ],
    [allocation.allocationId, allocation.dropId, allocation.participantId, allocation.queueEntryId, allocation.queueSequence, allocation.seatId, allocation.allocatedAt]
  );
  if (String(values[0] ?? "") !== "OK") throw new AllocationUnavailableError();
}

export async function claimAllocationForUser(dropId: string, clerkId: string) {
  const result = await claimAllocation(dropId, clerkId, {
    getDrop: async (requestedDropId) => {
      const drop = await Drop.findOne({ dropId: requestedDropId }).lean();
      if (!drop) return null;
      // The current demo must never allocate more than 500 seats even if misconfigured.
      const capacity = drop.dropId === "fairdrop-demo" ? Math.min(drop.capacity, 500) : drop.capacity;
      return { dropId: drop.dropId, capacity, status: drop.status, startsAt: drop.startsAt, endsAt: drop.endsAt };
    },
    getParticipant: async (requestedDropId, requestedClerkId) => {
      const participant = await Participation.findOne({ dropId: requestedDropId, clerkId: requestedClerkId }).lean();
      return participant ? { participantId: participant.participantId } : null;
    },
    getQueueEntry: async (requestedDropId, participantId) => {
      const queue = await QueueEntry.findOne({ dropId: requestedDropId, participantId }).lean();
      return queue ? { dropId: queue.dropId, participantId: queue.participantId, queueEntryId: queue.queueEntryId, sequence: queue.sequence, status: queue.status } : null;
    },
    getExistingAllocation: async (requestedDropId, participantId) => {
      const existing = await Allocation.findOne({ dropId: requestedDropId, participantId }).lean();
      return existing ? toAllocationState(existing) : null;
    },
    reserveAllocation,
    persistAllocation,
  });

  try {
    await finalizeReservation(result.allocation);
  } catch {
    // MongoDB is durable truth after persistence. A retry safely repairs this Redis mirror.
    console.error("Allocation Redis finalization sync failed");
  }
  return result;
}
