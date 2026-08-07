import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";

export type FriendInviteTokenPayload = {
  displayName: string;
  expiresAt: string;
  nonce: string;
};

function getInviteSecret(): string {
  const secret = process.env.FRIEND_INVITE_SECRET;
  if (!secret) throw new Error("FRIEND_INVITE_SECRET is not configured.");
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getInviteSecret()).update(value).digest("base64url");
}

export function createFriendInviteToken(
  displayName: string,
  expiresAt: Date,
): string {
  const payload: FriendInviteTokenPayload = {
    displayName: displayName.trim().slice(0, 80) || "An Atlas Academy player",
    expiresAt: expiresAt.toISOString(),
    nonce: randomUUID(),
  };
  const payloadPart = encode(JSON.stringify(payload));
  const unsignedToken = `${TOKEN_VERSION}.${payloadPart}`;
  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyFriendInviteToken(token: string): FriendInviteTokenPayload | null {
  const [version, payloadPart, signature, ...extraParts] = token.split(".");
  if (version !== TOKEN_VERSION || !payloadPart || !signature || extraParts.length > 0) {
    return null;
  }

  const unsignedToken = `${version}.${payloadPart}`;
  const expectedSignature = sign(unsignedToken);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  const decodedPayload = decode(payloadPart);
  if (!decodedPayload) return null;

  try {
    const payload = JSON.parse(decodedPayload) as FriendInviteTokenPayload;
    const expiresAt = new Date(payload.expiresAt);
    if (
      typeof payload.displayName !== "string" ||
      typeof payload.expiresAt !== "string" ||
      typeof payload.nonce !== "string" ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashFriendInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
