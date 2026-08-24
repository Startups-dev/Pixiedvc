import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260824000002_owner_account_closure_hardening.sql"),
  "utf8",
);

describe("owner account closure hardening migration", () => {
  it("guards optional private inventory policy changes behind relation and column checks", () => {
    expect(migrationSql).toContain("to_regclass('public.private_inventory') is not null");
    expect(migrationSql).toContain("table_name = 'private_inventory' and column_name = 'owner_id'");
    expect(migrationSql).toContain("table_name = 'private_inventory' and column_name = 'status'");
    expect(migrationSql).not.toMatch(/^drop policy if exists "Owners can insert private inventory" on public\.private_inventory;/m);
    expect(migrationSql).not.toMatch(/^create policy "Owners can insert private inventory"\n\s+on public\.private_inventory/m);
  });

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
    expect(migrationSql).toContain("to_jsonb(old)");
    expect(migrationSql).toContain("to_regclass('public.rentals') is not null");
  });

  it("does not reintroduce table-wide operational reset deletes", () => {
    expect(migrationSql).not.toMatch(/delete from public\.contracts\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.payout_ledger\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.rentals\s*;/i);
    expect(migrationSql).not.toMatch(/delete from public\.booking_matches\s*;/i);
    expect(migrationSql).not.toContain("delete from public.payout_ledger");
    expect(migrationSql).not.toContain("delete from public.rental_documents");
    expect(migrationSql).not.toContain("delete from public.rental_exceptions");
    expect(migrationSql).toContain("v_test_filter text := 'coalesce(is_test_listing, false) = true'");
    expect(migrationSql).toContain("using v_disposable_rental_ids");
    expect(migrationSql).toContain("using v_booking_ids");
  });

  it("guards optional reset tables and test-listing columns before dynamic SQL uses them", () => {
    for (const tableName of [
      "ready_stays",
      "contracts",
      "contract_events",
      "rental_milestones",
      "booking_request_guests",
      "booking_matches",
      "guest_request_activity",
      "confirmed_bookings",
      "booking_requests",
    ]) {
      expect(migrationSql).toContain(`to_regclass('public.${tableName}') is not null`);
    }

    expect(migrationSql).toContain("table_name = 'ready_stays' and column_name = 'is_test_listing'");
    expect(migrationSql).toContain("table_name = 'ready_stays' and column_name = 'rental_id'");
    expect(migrationSql).toContain("table_name = 'booking_matches' and column_name = 'booking_id'");
  });
});
