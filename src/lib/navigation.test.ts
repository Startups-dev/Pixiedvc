import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/admin-emails", () => ({
  emailIsAllowedForAdmin: (email: string) => email === "configured-admin@example.com",
  isAdminEmailStrict: (email: string) => email === "configured-admin@example.com",
}));

import { resolveAccountNavigation } from "./navigation";
import { createSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdminClient } from "./supabase-admin";
import { getLoginDestination } from "./routes/home";

type Fixture = {
  authenticated?: boolean;
  profileRole?: string | null;
  metadataRole?: string;
  appRole?: string;
  email?: string;
  onboarded?: boolean;
  owner?: { id: string; agreement_accepted_at?: string | null; metadata?: object; lifecycle_status?: string };
  ownerById?: boolean;
  affiliate?: { id: string; status: string };
  affiliateByEmail?: boolean;
  queryError?: string;
};

function setup(input: Fixture = {}) {
  const writes = vi.fn(() => { throw new Error("Navigation must not write"); });
  const reads: Array<{ table: string; column: string; value: string }> = [];
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: input.authenticated === false ? null : {
        id: "account-1",
        email: input.email ?? "account@example.com",
        app_metadata: { role: input.appRole },
        user_metadata: { role: input.metadataRole },
      } } }),
      updateUser: writes,
      admin: { updateUserById: writes },
    },
    from: vi.fn((table: string) => ({
      insert: writes, update: writes, upsert: writes, delete: writes,
      select: vi.fn(() => ({
        eq: vi.fn((column: string, value: string) => {
          reads.push({ table, column, value });
          let data: unknown = null;
          if (table === "profiles") data = { display_name: "Account", role: input.profileRole, onboarding_completed: input.onboarded };
          if (table === "owners" && (!input.ownerById || column === "id")) data = input.owner ?? null;
          if (table === "affiliates" && (!input.affiliateByEmail || column === "email")) data = input.affiliate ?? null;
          return { maybeSingle: vi.fn().mockResolvedValue({
            data, error: input.queryError === table ? new Error("Read failed") : null,
          }) };
        }),
      })),
    })),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
  vi.mocked(getSupabaseAdminClient).mockReturnValue(client as unknown as ReturnType<typeof getSupabaseAdminClient>);
  return { client, writes, reads };
}

describe("read-only account navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns no account or database reads for anonymous visitors", async () => {
    const { client, writes } = setup({ authenticated: false });
    expect(await resolveAccountNavigation()).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  });

  it.each([
    { profileRole: "admin" },
    { appRole: "admin", profileRole: "guest" },
    { email: "configured-admin@example.com", profileRole: "guest" },
  ])("uses the existing admin policy for %j", async (fixture) => {
    const { writes } = setup(fixture);
    const navigation = await resolveAccountNavigation();
    expect(navigation?.defaultHref).toBe("/admin");
    expect(navigation?.dashboards).toContainEqual({ id: "admin", label: "Admin", href: "/admin" });
    expect(writes).not.toHaveBeenCalled();
  });

  it("prioritizes authorized admin access over stale owner metadata without granting owner access by admin status alone", async () => {
    setup({ appRole: "admin", profileRole: "guest", metadataRole: "owner", onboarded: true,
      owner: { id: "account-1", agreement_accepted_at: "2026-01-01" } });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.defaultHref).toBe("/admin");
    expect(getLoginDestination(navigation, "/owner/rentals?tab=active")).toBe("/owner/rentals?tab=active");
    setup({ appRole: "admin", profileRole: "guest" });
    const adminOnly = await resolveAccountNavigation();
    expect(adminOnly?.dashboards.some((item) => item.id === "owner")).toBe(false);
    expect(getLoginDestination(adminOnly, "/owner/dashboard")).toBe("/admin");
    expect(adminOnly?.dashboards.some((item) => item.id === "affiliate")).toBe(false);
  });

  it("never treats editable admin metadata or legacy role names as an admin or owner grant", async () => {
    setup({ profileRole: "guest", metadataRole: "admin" });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.dashboards.map((item) => item.id)).toEqual(["guest"]);
    expect(navigation?.defaultHref).toBe("/my-trip");
    setup({ profileRole: "owner_verified" });
    expect((await resolveAccountNavigation())?.dashboards.map((item) => item.id)).toEqual(["guest"]);
  });

  it.each([
    [{ onboarded: false }, "/owner/onboarding"],
    [{ onboarded: true }, "/owner/dashboard"],
    [{ onboarded: true, owner: { id: "account-1" } }, "/owner/onboarding/agreement"],
    [{ onboarded: true, owner: { id: "account-1", agreement_accepted_at: "2026-01-01" } }, "/owner/dashboard"],
    [{ onboarded: true, owner: { id: "account-1", metadata: { agreement: { accepted_at: "2026-01-01" } } } }, "/owner/dashboard"],
    [{ onboarded: true, owner: { id: "account-1", metadata: { agreement: { accepted_at: true } } } }, "/owner/onboarding/agreement"],
    [{ onboarded: true, owner: { id: "account-1", agreement_accepted_at: "2026-01-01", lifecycle_status: "suspended" } }, "/owner/account-status"],
    [{ onboarded: true, owner: { id: "account-1", agreement_accepted_at: "2026-01-01", lifecycle_status: "deactivated" } }, "/owner/account-status"],
  ] satisfies Array<[Fixture, string]>)("preserves owner lifecycle destination for %j", async (fixture, expected) => {
    const { writes } = setup({ profileRole: "owner", ...fixture });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.dashboards.find((item) => item.id === "owner")?.href).toBe(expected);
    expect(navigation?.defaultHref).toBe(expected);
    expect(writes).not.toHaveBeenCalled();
  });

  it("uses the existing owner ID fallback without repairing or creating records", async () => {
    const { reads, writes } = setup({ profileRole: "owner", onboarded: true, ownerById: true,
      owner: { id: "account-1", agreement_accepted_at: "2026-01-01" } });
    expect((await resolveAccountNavigation())?.defaultHref).toBe("/owner/dashboard");
    expect(reads.filter((read) => read.table === "owners").map((read) => read.column)).toEqual(["user_id", "id"]);
    expect(writes).not.toHaveBeenCalled();
  });

  it("mirrors owner role precedence rather than changing the existing guard", async () => {
    setup({ profileRole: "owner", metadataRole: "guest" });
    expect((await resolveAccountNavigation())?.dashboards.map((item) => item.id)).toEqual(["guest"]);
  });

  it.each(["active", "approved", "verified"])("recognizes an existing %s affiliate independently of the primary role", async (status) => {
    const { writes, reads } = setup({ profileRole: "guest", affiliateByEmail: true, affiliate: { id: "affiliate-1", status } });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.dashboards.map((item) => item.id)).toEqual(["affiliate", "guest"]);
    expect(navigation?.defaultHref).toBe("/affiliate/dashboard");
    expect(reads.filter((read) => read.table === "affiliates").map((read) => read.column)).toEqual(["auth_user_id", "email"]);
    expect(writes).not.toHaveBeenCalled();
  });

  it.each(["suspended", "rejected", "pending_review"])("does not advertise a %s affiliate grant", async (status) => {
    setup({ profileRole: "affiliate", affiliate: { id: "affiliate-1", status } });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.dashboards.map((item) => item.id)).toEqual(["guest"]);
    expect(navigation?.defaultHref).toBe("/affiliate/dashboard");
  });

  it("preserves the existing affiliate home when no active affiliate record is available", async () => {
    const { writes } = setup({ profileRole: "affiliate" });
    const navigation = await resolveAccountNavigation();
    expect(navigation?.defaultHref).toBe("/affiliate/dashboard");
    expect(navigation?.dashboards.some((item) => item.id === "affiliate")).toBe(false);
    expect(writes).not.toHaveBeenCalled();
  });

  it("keeps new accounts on onboarding and guest workspaces available to signed-in users", async () => {
    setup();
    const navigation = await resolveAccountNavigation();
    expect(navigation?.defaultHref).toBe("/onboarding");
    expect(navigation?.dashboards.map((item) => item.id)).toEqual(["guest"]);
  });

  it("does not reuse another account's navigation across resolver calls", async () => {
    setup({ profileRole: "admin" });
    expect((await resolveAccountNavigation())?.defaultHref).toBe("/admin");
    setup({ profileRole: "guest" });
    expect((await resolveAccountNavigation())?.dashboards.map((item) => item.id)).toEqual(["guest"]);
  });

  it("fails closed on a database error without attempting a write", async () => {
    const { writes } = setup({ profileRole: "admin", queryError: "profiles" });
    await expect(resolveAccountNavigation()).rejects.toThrow("Read failed");
    expect(writes).not.toHaveBeenCalled();
  });
});
