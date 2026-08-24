import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824000002_owner_account_closure_hardening.sql"),
  "utf8",
);

describe("owner account closure hardening migration", () => {
  it("keeps private inventory writes lifecycle gated", () => {
    expect(migrationSql).toContain("Owners can insert private inventory");
    expect(migrationSql).toContain("Owners can update submitted inventory");
    expect(migrationSql).toContain("coalesce(o.lifecycle_status, 'active') = 'active'");
  });

  it("prevents direct deletion of history-bearing rentals", () => {
    expect(migrationSql).toContain("create or replace function public.prevent_history_rental_delete");
    expect(migrationSql).toContain("create trigger prevent_history_rental_delete");
    expect(migrationSql).toContain("rental_has_payout_history_soft_close_instead");
    expect(migrationSql).toContain("rental_has_document_history_soft_close_instead");
    expect(migrationSql).toContain("rental_has_ready_stay_history_soft_close_instead");
  });

  it("does not reintroduce table-wide operational reset deletes", () => {
    expect(migrationSql).not.toMatch(/delete from public\.contracts\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.payout_ledger\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.rentals\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.booking_matches\s*;/i);
    expect(migrationSql).toContain("where coalesce(is_test_listing, false) = true");
    expect(migrationSql).toContain("where rental_id = any(v_rental_ids)");
    expect(migrationSql).toContain("where booking_request_id = any(v_booking_ids)");
  });
});
