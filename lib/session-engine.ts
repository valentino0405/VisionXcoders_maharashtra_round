export type FairDropSessionStatus = "ACTIVE" | "EXPIRED";

export type FairDropSession = {
  sessionId: string;
  clerkId: string;
  activeDropId: string | null;
  participantId: string | null;
  queueEntryId: string | null;
  allocationId: string | null;
  status: FairDropSessionStatus;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type RecoveredFairDropState = {
  activeDropId: string | null;
  drop: { dropId: string; status: "ACTIVE" | "INACTIVE" | null; exists: boolean } | null;
  participation: { participantId: string; dropId: string; joinedAt: string } | null;
  queue: {
    queueEntryId: string;
    sequence: number;
    position: number;
    status: "WAITING" | "ACTIVE";
    joinedAt: string;
  } | null;
  allocation: {
    allocationId: string;
    queueEntryId: string;
    queueSequence: number;
    seatId: string;
    status: "ALLOCATED";
    allocatedAt: string;
  } | null;
};

export type SessionRecoveryDependencies = {
  readSession: (sessionId: string) => Promise<FairDropSession | null>;
  writeSession: (session: FairDropSession, ttlSeconds: number) => Promise<void>;
  recoverAuthoritativeState: (clerkId: string, preferredDropId: string | null) => Promise<RecoveredFairDropState>;
  createSessionId: () => string;
  now?: () => Date;
};

export class SessionUnavailableError extends Error {
  constructor() {
    super("SESSION_UNAVAILABLE");
    this.name = "SessionUnavailableError";
  }
}

export function isSessionOwnedBy(session: FairDropSession, clerkId: string, now = new Date()): boolean {
  return (
    session.status === "ACTIVE" &&
    session.clerkId === clerkId &&
    Number.isFinite(new Date(session.expiresAt).getTime()) &&
    new Date(session.expiresAt).getTime() > now.getTime()
  );
}

export async function recoverSessionState(
  input: { clerkId: string; sessionId?: string | null; ttlSeconds: number },
  dependencies: SessionRecoveryDependencies
): Promise<{ session: FairDropSession; state: RecoveredFairDropState; recreated: boolean }> {
  if (!input.clerkId || !Number.isSafeInteger(input.ttlSeconds) || input.ttlSeconds < 1) {
    throw new SessionUnavailableError();
  }
  const now = dependencies.now?.() ?? new Date();
  let existing: FairDropSession | null = null;

  if (input.sessionId) {
    const candidate = await dependencies.readSession(input.sessionId);
    // A foreign, expired, or malformed session is never reused or returned.
    if (candidate && isSessionOwnedBy(candidate, input.clerkId, now)) existing = candidate;
  }

  const state = await dependencies.recoverAuthoritativeState(input.clerkId, existing?.activeDropId ?? null);
  const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1_000).toISOString();
  const session: FairDropSession = {
    sessionId: existing?.sessionId ?? dependencies.createSessionId(),
    clerkId: input.clerkId,
    activeDropId: state.activeDropId,
    participantId: state.participation?.participantId ?? null,
    queueEntryId: state.queue?.queueEntryId ?? null,
    allocationId: state.allocation?.allocationId ?? null,
    status: "ACTIVE",
    createdAt: existing?.createdAt ?? now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt,
  };

  await dependencies.writeSession(session, input.ttlSeconds);
  return { session, state, recreated: !existing };
}
