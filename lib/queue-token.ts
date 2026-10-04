import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type QueueTokenPayload = {
  version: 1;
  dropId: string;
  participantId: string;
  queueEntryId: string;
  issuedAt: number;
  expiresAt: number;
};

export type QueueTokenVerification =
  | { valid: true; payload: QueueTokenPayload }
  | {
      valid: false;
      reason:
        | "MALFORMED"
        | "INVALID_SIGNATURE"
        | "EXPIRED"
        | "CROSS_DROP"
        | "CROSS_PARTICIPANT"
        | "CROSS_QUEUE_ENTRY";
    };

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

/**
 * Raised when the token secret is not configured in production.
 * The queue-join route catches this specifically and returns 503.
 */
export class QueueTokenConfigError extends Error {
  constructor() {
    super("QUEUE_TOKEN_SECRET is not configured or too short");
    this.name = "QueueTokenConfigError";
  }
}

/**
 * Development-only fallback secret used when QUEUE_TOKEN_SECRET is absent or
 * shorter than 32 characters. Tokens issued with this secret are only valid
 * within the same development process. In production the env var is required.
 */
const DEV_FALLBACK_SECRET = "dev-fairdrop-queue-token-secret-development";

export function getQueueTokenSecret(): string {
  const secret = process.env.QUEUE_TOKEN_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  // Allow the app to work out-of-the-box in development without manual env setup.
  if (process.env.NODE_ENV !== "production") {
    if (!secret) {
      console.warn(
        "[FairDrop] QUEUE_TOKEN_SECRET is not set. " +
          "Using a development-only fallback. " +
          "Add QUEUE_TOKEN_SECRET (≥ 32 characters) to .env.local before deploying.",
      );
    } else {
      console.warn(
        `[FairDrop] QUEUE_TOKEN_SECRET is only ${secret.length} characters (minimum 32). ` +
          "Using a development-only fallback. Set a longer value in .env.local.",
      );
    }
    return DEV_FALLBACK_SECRET;
  }

  // In production, a proper secret is non-negotiable.
  throw new QueueTokenConfigError();
}

export function issueQueueToken(
  input: Pick<QueueTokenPayload, "dropId" | "participantId" | "queueEntryId">,
  secret: string,
  now = new Date()
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: QueueTokenPayload = {
    version: 1,
    ...input,
    issuedAt,
    expiresAt: issuedAt + TOKEN_LIFETIME_SECONDS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function verifyQueueTokenDetailed(
  token: string,
  expected: Pick<QueueTokenPayload, "dropId" | "participantId" | "queueEntryId">,
  secret: string,
  now = new Date()
): QueueTokenVerification {
  const parts = token.split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "MALFORMED" };
  }

  const expectedSignature = signature(parts[0], secret);
  const providedSignature = Buffer.from(parts[1], "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Partial<QueueTokenPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    if (
      payload.version !== 1 ||
      typeof payload.dropId !== "string" ||
      typeof payload.participantId !== "string" ||
      typeof payload.queueEntryId !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return { valid: false, reason: "MALFORMED" };
    }

    if (payload.issuedAt > nowSeconds + 60 || payload.expiresAt <= nowSeconds) {
      return { valid: false, reason: "EXPIRED" };
    }
    if (payload.dropId !== expected.dropId) {
      return { valid: false, reason: "CROSS_DROP" };
    }
    if (payload.participantId !== expected.participantId) {
      return { valid: false, reason: "CROSS_PARTICIPANT" };
    }
    if (payload.queueEntryId !== expected.queueEntryId) {
      return { valid: false, reason: "CROSS_QUEUE_ENTRY" };
    }

    return { valid: true, payload: payload as QueueTokenPayload };
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }
}

export function verifyQueueToken(
  token: string,
  expected: Pick<QueueTokenPayload, "dropId" | "participantId" | "queueEntryId">,
  secret: string,
  now = new Date()
): QueueTokenPayload | null {
  const result = verifyQueueTokenDetailed(token, expected, secret, now);
  return result.valid ? result.payload : null;
}
