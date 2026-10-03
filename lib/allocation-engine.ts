import { createHash } from "node:crypto";

export type AllocationStatus = "ALLOCATED";

export type AllocationState = {
  allocationId: string;
  dropId: string;
  participantId: string;
  clerkId: string;
  queueEntryId: string;
  queueSequence: number;
  seatId: string;
  status: AllocationStatus;
  allocatedAt: string;
};

export type AllocationDropState = {
  dropId: string;
  capacity: number;
  status: "ACTIVE" | "INACTIVE";
  startsAt: Date;
  endsAt: Date | null;
};

export type AllocationQueueState = {
  dropId: string;
  participantId: string;
  queueEntryId: string;
  sequence: number;
  status: "WAITING" | "ACTIVE";
};

export type AllocationReservation =
  | { kind: "RESERVED" | "EXISTING"; allocation: AllocationState }
  | { kind: "NOT_ELIGIBLE" }
  | { kind: "SOLD_OUT" }
  | { kind: "CONFLICT" };

export type AllocationEngineDependencies = {
  getDrop: (dropId: string) => Promise<AllocationDropState | null>;
  getParticipant: (dropId: string, clerkId: string) => Promise<{ participantId: string } | null>;
  getQueueEntry: (dropId: string, participantId: string) => Promise<AllocationQueueState | null>;
  getExistingAllocation: (dropId: string, participantId: string) => Promise<AllocationState | null>;
  reserveAllocation: (allocation: AllocationState, capacity: number) => Promise<AllocationReservation>;
  persistAllocation: (allocation: AllocationState) => Promise<{ allocation: AllocationState; created: boolean }>;
  now?: () => Date;
};

export type AllocationEngineErrorCode =
  | "DROP_NOT_FOUND"
  | "DROP_NOT_ACTIVE"
  | "NOT_A_PARTICIPANT"
  | "NOT_QUEUED"
  | "NOT_ELIGIBLE"
  | "SOLD_OUT"
  | "ALLOCATION_CONFLICT";

export class AllocationEngineError extends Error {
  readonly code: AllocationEngineErrorCode;

  constructor(code: AllocationEngineErrorCode) {
    super(code);
    this.name = "AllocationEngineError";
    this.code = code;
  }
}

export function allocationIdFor(dropId: string, participantId: string): string {
  return `a_${createHash("sha256").update(`${dropId}:${participantId}`).digest("base64url")}`;
}

export function seatIdForSequence(dropId: string, sequence: number, capacity: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || !Number.isSafeInteger(capacity) || capacity < 1) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }
  const width = Math.max(3, String(capacity).length);
  return `${dropId}-seat-${String(sequence).padStart(width, "0")}`;
}

function sameAllocation(left: AllocationState, right: AllocationState): boolean {
  return (
    left.dropId === right.dropId &&
    left.participantId === right.participantId &&
    left.queueEntryId === right.queueEntryId &&
    left.queueSequence === right.queueSequence &&
    left.seatId === right.seatId &&
    left.allocationId === right.allocationId
  );
}

/**
 * Server-side orchestration only. Queue sequence defines the initial cohort:
 * sequence 1..capacity map directly to deterministic seat IDs 1..capacity.
 */
export async function claimAllocation(
  dropId: string,
  clerkId: string,
  dependencies: AllocationEngineDependencies
): Promise<{ allocation: AllocationState; created: boolean }> {
  const now = dependencies.now?.() ?? new Date();
  const drop = await dependencies.getDrop(dropId);

  if (!drop) throw new AllocationEngineError("DROP_NOT_FOUND");
  if (!Number.isSafeInteger(drop.capacity) || drop.capacity < 1) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }

  const participant = await dependencies.getParticipant(dropId, clerkId);
  if (!participant) throw new AllocationEngineError("NOT_A_PARTICIPANT");

  const existing = await dependencies.getExistingAllocation(dropId, participant.participantId);
  if (existing) return { allocation: existing, created: false };

  // Existing durable allocations remain idempotently readable even after a drop closes.
  // Active timing gates only new reservations.
  const hasStarted = drop.startsAt.getTime() <= now.getTime();
  const hasEnded = drop.endsAt !== null && drop.endsAt.getTime() <= now.getTime();
  if (drop.status !== "ACTIVE" || !hasStarted || hasEnded) {
    throw new AllocationEngineError("DROP_NOT_ACTIVE");
  }

  const queue = await dependencies.getQueueEntry(dropId, participant.participantId);
  if (!queue) throw new AllocationEngineError("NOT_QUEUED");
  if (queue.dropId !== dropId || queue.participantId !== participant.participantId) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }
  if (!Number.isSafeInteger(queue.sequence) || queue.sequence < 1) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }
  if (queue.sequence > drop.capacity) throw new AllocationEngineError("NOT_ELIGIBLE");

  const allocation: AllocationState = {
    allocationId: allocationIdFor(dropId, participant.participantId),
    dropId,
    participantId: participant.participantId,
    clerkId,
    queueEntryId: queue.queueEntryId,
    queueSequence: queue.sequence,
    seatId: seatIdForSequence(dropId, queue.sequence, drop.capacity),
    status: "ALLOCATED",
    allocatedAt: now.toISOString(),
  };
  const reservation = await dependencies.reserveAllocation(allocation, drop.capacity);
  if (reservation.kind === "NOT_ELIGIBLE") throw new AllocationEngineError("NOT_ELIGIBLE");
  if (reservation.kind === "SOLD_OUT") throw new AllocationEngineError("SOLD_OUT");
  if (reservation.kind === "CONFLICT" || !sameAllocation(reservation.allocation, allocation)) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }

  // Persist the reservation returned by Redis, including its original timestamp.
  // A retry after a Mongo failure must not manufacture a second reservation state.
  const persisted = await dependencies.persistAllocation(reservation.allocation);
  if (!sameAllocation(persisted.allocation, allocation)) {
    throw new AllocationEngineError("ALLOCATION_CONFLICT");
  }
  return persisted;
}
