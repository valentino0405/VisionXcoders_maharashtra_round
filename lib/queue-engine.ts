export type QueueState = {
  queueEntryId: string;
  dropId: string;
  participantId: string;
  sequence: number;
  position: number;
  status: "WAITING" | "ACTIVE";
  joinedAt: string;
};

export type QueueJoinResult = {
  queue: QueueState;
  created: boolean;
  totalQueued: number;
};

export type QueueEngineDependencies = {
  getDrop: (dropId: string) => Promise<{
    status: "ACTIVE" | "INACTIVE";
    startsAt: Date;
    endsAt: Date | null;
  } | null>;
  getParticipant: (dropId: string, clerkId: string) => Promise<{ participantId: string } | null>;
  getQueueEntry: (dropId: string, participantId: string) => Promise<QueueState | null>;
  reserveQueueEntry: (input: {
    dropId: string;
    participantId: string;
    queueEntryId: string;
    joinedAt: string;
  }) => Promise<QueueState>;
  persistQueueEntry: (input: QueueState & { clerkId: string }) => Promise<{
    queue: QueueState;
    created: boolean;
  }>;
  finalizeQueueEntry: (queue: QueueState) => Promise<number>;
  createQueueEntryId: () => string;
  now?: () => Date;
};

export type QueueEngineErrorCode =
  | "DROP_NOT_FOUND"
  | "DROP_NOT_ACTIVE"
  | "NOT_A_PARTICIPANT";

export class QueueEngineError extends Error {
  readonly code: QueueEngineErrorCode;

  constructor(code: QueueEngineErrorCode) {
    super(code);
    this.name = "QueueEngineError";
    this.code = code;
  }
}

export async function enterQueue(
  dropId: string,
  clerkId: string,
  dependencies: QueueEngineDependencies
): Promise<QueueJoinResult> {
  const now = dependencies.now?.() ?? new Date();
  const drop = await dependencies.getDrop(dropId);

  if (!drop) {
    throw new QueueEngineError("DROP_NOT_FOUND");
  }

  const hasStarted = drop.startsAt.getTime() <= now.getTime();
  const hasEnded = drop.endsAt !== null && drop.endsAt.getTime() <= now.getTime();

  if (drop.status !== "ACTIVE" || !hasStarted || hasEnded) {
    throw new QueueEngineError("DROP_NOT_ACTIVE");
  }

  const participant = await dependencies.getParticipant(dropId, clerkId);

  if (!participant) {
    throw new QueueEngineError("NOT_A_PARTICIPANT");
  }

  const existing = await dependencies.getQueueEntry(dropId, participant.participantId);

  if (existing) {
    const totalQueued = await dependencies.finalizeQueueEntry(existing);
    return { queue: existing, created: false, totalQueued };
  }

  const reservation = await dependencies.reserveQueueEntry({
    dropId,
    participantId: participant.participantId,
    queueEntryId: dependencies.createQueueEntryId(),
    joinedAt: now.toISOString(),
  });
  const persisted = await dependencies.persistQueueEntry({ ...reservation, clerkId });
  const totalQueued = await dependencies.finalizeQueueEntry(persisted.queue);

  return { ...persisted, totalQueued };
}

export function queueSequenceKey(environment: string, dropId: string): string {
  return `fairdrop:${environment}:queue:sequence:${dropId}`;
}

export function queueEntryKey(
  environment: string,
  dropId: string,
  participantId: string
): string {
  return `fairdrop:${environment}:queue:entry:${dropId}:${participantId}`;
}

export function queueOrderKey(environment: string, dropId: string): string {
  return `fairdrop:${environment}:queue:order:${dropId}`;
}
