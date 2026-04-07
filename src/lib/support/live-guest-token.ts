import crypto from "node:crypto";

const DEFAULT_TTL_SECONDS = 60 * 60 * 4;

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLength), "base64").toString("utf8");
}

function getSecret() {
  return (
    process.env.SUPPORT_LIVE_GUEST_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function sign(payload: string) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("support_live_guest_secret_missing");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createSupportLiveGuestToken(
  conversationId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  const payload = JSON.stringify({
    conversationId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    v: 1,
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySupportLiveGuestToken(
  token: string,
  conversationId: string,
) {
  if (!token || !conversationId) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;
  const expected = sign(encodedPayload);
  if (expected !== signature) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      conversationId?: string;
      exp?: number;
    };
    if (payload.conversationId !== conversationId) return false;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
