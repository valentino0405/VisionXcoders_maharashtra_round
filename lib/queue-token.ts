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

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function getQueueTokenSecret(): string {
  const secret = process.env.QUEUE_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("QUEUE_TOKEN_SECRET must contain at least 32 characters");
  }

  return secret;
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

export function verifyQueueToken(
  token: string,
  expected: Pick<QueueTokenPayload, "dropId" | "participantId" | "queueEntryId">,
  secret: string,
  now = new Date()
): QueueTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const expectedSignature = signature(parts[0], secret);
  const providedSignature = Buffer.from(parts[1], "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Partial<QueueTokenPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    if (
      payload.version !== 1 ||
      payload.dropId !== expected.dropId ||
      payload.participantId !== expected.participantId ||
      payload.queueEntryId !== expected.queueEntryId ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > nowSeconds + 60 ||
      payload.expiresAt <= nowSeconds
    ) {
      return null;
    }

    return payload as QueueTokenPayload;
  } catch {
    return null;
  }
}
