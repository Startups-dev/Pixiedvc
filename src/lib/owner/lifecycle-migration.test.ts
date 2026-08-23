import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260823000001_owner_lifecycle_safety.sql"),
  "utf8",
);

describe("owner lifecycle safety migration", () => {
  it("blocks owner, profile, and auth user deletion when owner platform activity exists", () => {
    expect(migrationSql).toContain("create or replace function public.owner_has_platform_activity");
    expect(migrationSql).toContain("create trigger prevent_owner_delete_with_activity");
    expect(migrationSql).toContain("create trigger prevent_owner_profile_delete_with_activity");
    expect(migrationSql).toContain("create trigger prevent_auth_user_delete_with_owner_activity");
    expect(migrationSql).toContain("before delete on public.owners");
    expect(migrationSql).toContain("before delete on public.profiles");
    expect(migrationSql).toContain("before delete on auth.users");
  });

  it("treats financial, reservation, membership, and audit records as platform activity", () => {
    for (const tableName of [
      "owner_memberships",
      "rentals",
      "ready_stays",
      "booking_matches",
      "contracts",
      "payouts",
      "quotes",
      "point_liquidation_requests",
      "owner_documents",
      "owner_verification_events",
    ]) {
      expect(migrationSql).toContain(`public.${tableName}`);
    }
  });

  it("makes ready_stays owner deletion non-cascading", () => {
    expect(migrationSql).toContain("where c.conrelid = 'public.ready_stays'::regclass");
    expect(migrationSql).toContain("and c.confrelid = 'public.profiles'::regclass");
    expect(migrationSql).toContain("and a.attname = 'owner_id'");
    expect(migrationSql).toContain("foreign key (owner_id) references public.profiles(id) on delete restrict");
  });

  it("prevents inactive owners from gaining matchable membership inventory", () => {
    expect(migrationSql).toContain("create trigger prevent_inactive_owner_membership_inventory");
    expect(migrationSql).toContain("create trigger prevent_inactive_owner_use_year_inventory");
    expect(migrationSql).toContain("if coalesce(new.points_available, 0) > coalesce(old.points_available, 0) then");
    expect(migrationSql).toContain("if coalesce(new.available, 0) > coalesce(old.available, 0) then");
    expect(migrationSql).toContain("inactive_owner_membership_fallback_blocked");
  });
});
