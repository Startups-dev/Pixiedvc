import { createPublicKey, verify } from "node:crypto";

type GoogleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type GoogleJwks = { keys?: GoogleJwk[] };
type GoogleIdTokenClaims = {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
};

type VerifyOptions = {
  now?: number;
  fetcher?: typeof fetch;
};

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedKeys: GoogleJwk[] = [];
let cacheExpiresAt = 0;
let pendingKeys: Promise<GoogleJwk[]> | null = null;

function decodeJsonPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function getGoogleSigningKeys(fetcher: typeof fetch, now: number) {
  if (cachedKeys.length && cacheExpiresAt > now) return cachedKeys;
  if (!pendingKeys) {
    pendingKeys = (async () => {
      const response = await fetcher(GOOGLE_CERTS_URL, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error("GOOGLE_JWKS_UNAVAILABLE");
      const result = await response.json() as GoogleJwks;
      const keys = Array.isArray(result.keys) ? result.keys : [];
      if (!keys.some((key) => key.kid && key.kty === "RSA" && key.alg === "RS256")) throw new Error("GOOGLE_JWKS_UNAVAILABLE");
      const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1] ?? 3600);
      cachedKeys = keys;
      cacheExpiresAt = Date.now() + Math.max(60, Math.min(maxAge, 3600)) * 1000;
      return keys;
    })().finally(() => { pendingKeys = null; });
  }
  return pendingKeys;
}

export async function verifyGoogleServiceAccountToken(
  token: string,
  expectedAudience: string,
  expectedEmail: string,
  options: VerifyOptions = {},
) {
  const now = options.now ?? Date.now();
  const fetcher = options.fetcher ?? fetch;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  let header: { alg?: string; kid?: string };
  let claims: GoogleIdTokenClaims;
  try {
    header = decodeJsonPart(parts[0]);
    claims = decodeJsonPart(parts[1]);
  } catch {
    return false;
  }
  if (header.alg !== "RS256" || !header.kid) return false;
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return false;
  if (claims.aud !== expectedAudience || claims.email !== expectedEmail || claims.email_verified !== true) return false;
  if (typeof claims.exp !== "number" || claims.exp <= now / 1000) return false;
  if (typeof claims.iat !== "number" || claims.iat > now / 1000 + 60) return false;

  const keys = await getGoogleSigningKeys(fetcher, now);
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA" && key.alg === "RS256" && (!key.use || key.use === "sig"));
  if (!jwk) return false;

  try {
    const publicKey = createPublicKey({ key: jwk as unknown as import("node:crypto").JsonWebKey, format: "jwk" });
    const signature = Buffer.from(parts[2], "base64url");
    return verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, signature);
  } catch {
    return false;
  }
}
