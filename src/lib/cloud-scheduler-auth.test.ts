import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { verifyGoogleServiceAccountToken } from "@/lib/cloud-scheduler-auth";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };

function makeToken(overrides: Record<string, unknown> = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    aud: "https://hannadvc.com/api/cron/zoho-reconcile",
    email: "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com",
    email_verified: true,
    exp: 2_000,
    iat: 1_000,
    iss: "https://accounts.google.com",
    ...overrides,
  })).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

function keyFetcher() {
  return vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200,
    headers: { "cache-control": "max-age=60", "content-type": "application/json" },
  }));
}

describe("Cloud Scheduler OIDC verification", () => {
  it("accepts a correctly signed token for the scheduled service identity and audience", async () => {
    const fetcher = keyFetcher();
    expect(await verifyGoogleServiceAccountToken(
      makeToken(),
      "https://hannadvc.com/api/cron/zoho-reconcile",
      "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com",
      { now: 1_500_000, fetcher: fetcher as unknown as typeof fetch },
    )).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects another audience, another service identity, or an invalid signature", async () => {
    const fetcher = keyFetcher();
    const options = { now: 1_500_000, fetcher: fetcher as unknown as typeof fetch };
    const token = makeToken();
    expect(await verifyGoogleServiceAccountToken(token, "https://wrong.example", "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com", options)).toBe(false);
    expect(await verifyGoogleServiceAccountToken(token, "https://hannadvc.com/api/cron/zoho-reconcile", "other@pixiedvc-production.iam.gserviceaccount.com", options)).toBe(false);
    const parts = token.split(".");
    const signature = Buffer.from(parts[2], "base64url");
    signature[0] ^= 0xff;
    const tampered = `${parts[0]}.${parts[1]}.${signature.toString("base64url")}`;
    expect(await verifyGoogleServiceAccountToken(tampered, "https://hannadvc.com/api/cron/zoho-reconcile", "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com", options)).toBe(false);
  });

  it("fails closed when Google signing keys are unavailable", async () => {
    const now = Date.now() + 120_000;
    const seconds = Math.floor(now / 1000);
    await expect(verifyGoogleServiceAccountToken(makeToken({ iat: seconds - 5, exp: seconds + 3600 }), "https://hannadvc.com/api/cron/zoho-reconcile", "hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com", {
      now,
      fetcher: vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch,
    })).rejects.toThrow("GOOGLE_JWKS_UNAVAILABLE");
  });
});
