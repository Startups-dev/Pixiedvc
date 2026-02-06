"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card } from "@pixiedvc/design-system";
import type { OwnerMembership } from "@/lib/owner-data";
import type { ResortOption } from "@/lib/owner-membership-utils";
import { fixMembershipResortMapping, upsertOwnerMembership } from "@/app/owner/memberships/actions";
import OwnerPointsEventButtons from "@/components/owner/OwnerPointsEventButtons";

type MembershipFormState = {
  resort_id: string;
  use_year: string;
  borrowing_enabled: boolean;
  max_points_to_borrow: string;
  buckets: Array<{
    use_year_start: string;
    use_year_end: string;
    points_available: string;
    points_holding: string;
  }>;
  purchase_channel: string;
  acquired_at: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const emptyForm: MembershipFormState = {
  resort_id: "",
  use_year: "January",
  borrowing_enabled: false,
  max_points_to_borrow: "",
  buckets: [],
  purchase_channel: "unknown",
  acquired_at: "",
};

function formatUtcDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function computeUseYearEnd(startISO: string) {
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

function normalizeResortName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

export default function OwnerMembershipManager({
  memberships,
  resorts,
}: {
  memberships: OwnerMembership[];
  resorts: ResortOption[];
}) {
  const uniqueResorts = Array.from(
    resorts.reduce((map, resort) => {
      const key = normalizeResortName(resort.name);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, resort);
      } else if (!existing.calculator_code && resort.calculator_code) {
        map.set(key, resort);
      }
      return map;
    }, new Map<string, ResortOption>()).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const [formState, setFormState] = useState<MembershipFormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const groupedMemberships = useMemo(() => {
    const groups = new Map<string, OwnerMembership[]>();
    memberships.forEach((membership) => {
      const key = `${membership.resort_id ?? "unknown"}:${membership.use_year ?? "unknown"}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(membership);
    });
    return Array.from(groups.entries());
  }, [memberships]);

  useEffect(() => {
    if (!showForm) return;
    if (formState.buckets.length > 0) return;
    setFormState((prev) => ({
      ...prev,
      buckets: buildBuckets(prev.use_year),
    }));
  }, [showForm, formState.use_year, formState.buckets.length]);

  function startEdit(groupKey: string, groupRows: OwnerMembership[]) {
    setEditId(groupKey);
    setError(null);
    setShowForm(true);
    const primary = groupRows[0];
    const buckets = groupRows
      .filter((row) => row.use_year_start)
      .sort((a, b) => (a.use_year_start ?? "").localeCompare(b.use_year_start ?? ""))
      .map((row) => ({
        use_year_start: row.use_year_start ?? "",
        use_year_end: row.use_year_end ?? computeUseYearEnd(row.use_year_start ?? ""),
        points_available: (row.points_available ?? 0).toString(),
        points_holding: Math.max((row.points_owned ?? 0) - (row.points_available ?? 0), 0).toString(),
      }));
    setFormState({
      resort_id: primary?.resort_id ?? "",
      use_year: primary?.use_year ?? "January",
      borrowing_enabled: Boolean(primary?.borrowing_enabled),
      max_points_to_borrow: (primary?.max_points_to_borrow ?? 0).toString(),
      buckets,
      purchase_channel: primary?.purchase_channel ?? "unknown",
      acquired_at: primary?.acquired_at ?? "",
    });
  }

  function resetForm() {
    setEditId(null);
    setFormState(emptyForm);
    setShowForm(false);
    setError(null);
  }

  function buildBuckets(useYear: string) {
    const monthIndex = MONTHS.findIndex((month) => month === useYear);
    if (monthIndex < 0) return [];
    const today = new Date();
    const startThisYear = new Date(Date.UTC(today.getUTCFullYear(), monthIndex, 1));
    const currentUseYear = today < startThisYear ? today.getUTCFullYear() - 1 : today.getUTCFullYear();
    const starts = [currentUseYear, currentUseYear + 1, currentUseYear + 2].map((year) => {
      const start = new Date(Date.UTC(year, monthIndex, 1));
      const end = new Date(start);
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      end.setUTCDate(end.getUTCDate() - 1);
      return {
        use_year_start: start.toISOString().slice(0, 10),
        use_year_end: end.toISOString().slice(0, 10),
        points_available: "0",
        points_holding: "0",
      };
    });
    return starts;
  }

  function handleUseYearChange(value: string) {
    setFormState((prev) => ({
      ...prev,
      use_year: value,
      buckets: buildBuckets(value),
    }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    if (!formState.resort_id || !formState.use_year) {
      setError("Select a resort and use year.");
      setPending(false);
      return;
    }

    const buckets = (formState.buckets.length ? formState.buckets : buildBuckets(formState.use_year)).map((bucket) => ({
      use_year_start: bucket.use_year_start,
      use_year_end: bucket.use_year_end,
      points_available: Number(bucket.points_available || 0),
      points_holding: Number(bucket.points_holding || 0),
    }));

    const payload = {
      resort_id: formState.resort_id,
      use_year: formState.use_year,
      borrowing_enabled: formState.borrowing_enabled,
      max_points_to_borrow: formState.borrowing_enabled ? Number(formState.max_points_to_borrow || 0) : 0,
      buckets,
      purchase_channel: formState.purchase_channel,
      acquired_at: formState.acquired_at || null,
    };

    const result = await upsertOwnerMembership(payload);
    if (!result.ok) {
      setError(result.error ?? "Unable to save membership.");
      setPending(false);
      return;
    }

    resetForm();
    setPending(false);
  }

  async function handleFixMapping(membershipId: string) {
    setPending(true);
    setError(null);
    const result = await fixMembershipResortMapping(membershipId);
    if (!result.ok) {
      setError(result.error ?? "Unable to fix resort mapping.");
    }
    setPending(false);
  }

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner contracts & points</p>
          <h2 className="text-xl font-semibold text-ink">Owner contracts & points</h2>
        </div>
        <Button
          onClick={() => {
            setShowForm((prev) => !prev);
            setEditId(null);
            setFormState(emptyForm);
          }}
        >
          + Add new contract
        </Button>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {showForm ? (
        <form className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2" onSubmit={handleSave}>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resort</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.resort_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, resort_id: event.target.value }))}
              required
            >
              <option value="">Select a resort</option>
            {uniqueResorts.map((resort) => (
              <option key={resort.id} value={resort.id}>
                {resort.name} {resort.calculator_code ? `(${resort.calculator_code})` : ""}
              </option>
            ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Use year</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.use_year}
              onChange={(event) => handleUseYearChange(event.target.value)}
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Borrowing</label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formState.borrowing_enabled}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    borrowing_enabled: event.target.checked,
                    max_points_to_borrow: event.target.checked ? prev.max_points_to_borrow : "0",
                  }))
                }
              />
              I’m willing to borrow points from next year
            </label>
            {formState.borrowing_enabled ? (
              <div className="mt-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Maximum points I’m willing to borrow
                </label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={formState.max_points_to_borrow}
                  min={0}
                  onChange={(event) => setFormState((prev) => ({ ...prev, max_points_to_borrow: event.target.value }))}
                />
              </div>
            ) : null}
          </div>

          {formState.buckets.length === 0 ? (
            <p className="sm:col-span-2 text-sm text-slate-500">Select a use year to generate buckets.</p>
          ) : (
            <div className="sm:col-span-2 space-y-3">
              {formState.buckets.map((bucket, index) => (
                <div key={bucket.use_year_start} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {bucket.use_year_start} – {bucket.use_year_end}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Points available
                      </label>
                      <input
                        type="number"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={bucket.points_available}
                        min={0}
                        onChange={(event) =>
                          setFormState((prev) => {
                            const next = [...prev.buckets];
                            next[index] = { ...next[index], points_available: event.target.value };
                            return { ...prev, buckets: next };
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Points holding
                      </label>
                      <input
                        type="number"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={bucket.points_holding}
                        min={0}
                        onChange={(event) =>
                          setFormState((prev) => {
                            const next = [...prev.buckets];
                            next[index] = { ...next[index], points_holding: event.target.value };
                            return { ...prev, buckets: next };
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              <p className="mt-2 text-sm text-muted-foreground">
                Tip: Enter these numbers exactly as shown in your DVC Vacation Points dashboard (Available + In
                Holding).
              </p>
            </div>
          )}

          <div className="flex items-end gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {editId ? "Update contract" : "Save contract"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {memberships.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">No memberships on file yet.</p>
        ) : (
          groupedMemberships.map(([groupKey, groupRows]) => {
            const primary = groupRows[0];
            const resortCode = primary?.resort?.calculator_code ?? primary?.home_resort ?? "—";
            const resortName = primary?.resort?.name ?? "Resort TBD";
            const needsMapping = !primary?.resort_id && Boolean(primary?.home_resort);
            const createdAt = formatUtcDate(primary?.created_at ?? null);
            const buckets = [...groupRows].sort((a, b) => (a.use_year_start ?? "").localeCompare(b.use_year_start ?? ""));

            return (
              <details key={groupKey} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {resortName} {resortCode ? `(${resortCode})` : ""}
                    </p>
                    <p className="text-xs text-slate-500">Use year: {primary?.use_year ?? "—"}</p>
                    <p className="text-xs text-slate-500">Created: {createdAt}</p>
                    {needsMapping ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Needs resort mapping
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {needsMapping ? (
                      <Button type="button" variant="ghost" onClick={() => handleFixMapping(primary.id)} disabled={pending}>
                        Fix mapping
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" onClick={() => startEdit(groupKey, groupRows)}>
                      Edit
                    </Button>
                  </div>
                </summary>

                <div className="mt-4 space-y-3">
                  {buckets.map((bucket) => (
                    <div key={bucket.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {bucket.use_year_start ?? "—"} – {bucket.use_year_end ?? "—"}
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <Stat label="Available" value={bucket.points_available ?? 0} />
                        <Stat label="Holding" value={Math.max((bucket.points_owned ?? 0) - (bucket.points_available ?? 0), 0)} />
                        <Stat label="Rented" value={bucket.points_rented ?? 0} />
                      </div>
                      <OwnerPointsEventButtons
                        ownerMembershipId={bucket.id}
                        defaultAmount={bucket.points_available ?? 0}
                      />
                    </div>
                  ))}
                </div>
              </details>
            );
          })
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-ink">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
