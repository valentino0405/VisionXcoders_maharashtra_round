export type ParticipantState = {
  participantId: string;
  dropId: string;
  status: "JOINED";
};

export type DropState = {
  status: "ACTIVE" | "INACTIVE";
  startsAt: Date;
  endsAt: Date | null;
};

export type ParticipationUpsert = {
  participant: ParticipantState;
  created: boolean;
};

export type DropEngineDependencies = {
  getDrop: (dropId: string) => Promise<DropState | null>;
  upsertParticipation: (input: {
    dropId: string;
    clerkId: string;
    participantId: string;
    joinedAt: Date;
  }) => Promise<ParticipationUpsert>;
  cacheParticipant: (key: string, participant: ParticipantState) => Promise<void>;
  createParticipantId: () => string;
  now?: () => Date;
  onCacheError?: () => void;
};

export type DropEngineErrorCode = "DROP_NOT_FOUND" | "DROP_NOT_ACTIVE";

export class DropEngineError extends Error {
  readonly code: DropEngineErrorCode;

  constructor(code: DropEngineErrorCode) {
    super(code);
    this.name = "DropEngineError";
    this.code = code;
  }
}

const DROP_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function parseDropJoinRequest(body: unknown): { dropId: string } | null {
  if (typeof body !== "object" || body === null || !("dropId" in body)) {
    return null;
  }

  const dropId = (body as { dropId?: unknown }).dropId;

  if (typeof dropId !== "string" || dropId !== dropId.trim() || !DROP_ID_PATTERN.test(dropId)) {
    return null;
  }

  return { dropId };
}

export function getFairDropEnvironment(): string {
  const environment = process.env.FAIRDROP_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV;

  if (environment && /^[a-z0-9-]+$/i.test(environment)) {
    return environment.toLowerCase();
  }

  return "development";
}

export function participantRedisKey(
  environment: string,
  dropId: string,
  clerkId: string
): string {
  return `fairdrop:${environment}:participant:${dropId}:${clerkId}`;
}

export async function joinDrop(
  dropId: string,
  clerkId: string,
  dependencies: DropEngineDependencies
): Promise<ParticipationUpsert> {
  const now = dependencies.now?.() ?? new Date();
  const drop = await dependencies.getDrop(dropId);

  if (!drop) {
    throw new DropEngineError("DROP_NOT_FOUND");
  }

  const hasStarted = drop.startsAt.getTime() <= now.getTime();
  const hasEnded = drop.endsAt !== null && drop.endsAt.getTime() <= now.getTime();

  if (drop.status !== "ACTIVE" || !hasStarted || hasEnded) {
    throw new DropEngineError("DROP_NOT_ACTIVE");
  }

  const participation = await dependencies.upsertParticipation({
    dropId,
    clerkId,
    participantId: dependencies.createParticipantId(),
    joinedAt: now,
  });

  const redisKey = participantRedisKey(getFairDropEnvironment(), dropId, clerkId);

  try {
    await dependencies.cacheParticipant(redisKey, participation.participant);
  } catch {
    dependencies.onCacheError?.();
  }

  return participation;
}
