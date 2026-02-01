"use client";

import { useState } from "react";

import { Button, Card } from "@pixiedvc/design-system";
import type { OwnerMembership } from "@/lib/owner-data";
import type { ResortOption } from "@/lib/owner-membership-utils";
import {
  adjustOwnerMembershipPoints,
  fixMembershipResortMapping,
  upsertOwnerMembership,
} from "@/app/owner/memberships/actions";

type MembershipFormState = {
  resort_id: string;
  use_year: string;
  contract_year: string;
  points_owned: string;
  points_available: string;
  points_reserved: string;
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
  contract_year: new Date().getFullYear().toString(),
  points_owned: "",
  points_available: "",
  points_reserved: "0",
  purchase_channel: "unknown",
  acquired_at: "",
};

function formatUtcDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
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
  const [deltaByMembership, setDeltaByMembership] = useState<Record<string, string>>({});

  function startEdit(membership: OwnerMembership) {
    setEditId(membership.id);
    setError(null);
    setShowForm(true);
    setFormState({
      resort_id: membership.resort_id ?? "",
      use_year: membership.use_year ?? "January",
      contract_year: membership.contract_year?.toString() ?? new Date().getFullYear().toString(),
      points_owned: (membership.points_owned ?? 0).toString(),
      points_available: (membership.points_available ?? 0).toString(),
      points_reserved: (membership.points_reserved ?? 0).toString(),
      purchase_channel: membership.purchase_channel ?? "unknown",
      acquired_at: membership.acquired_at ?? "",
    });
  }

  function resetForm() {
    setEditId(null);
    setFormState(emptyForm);
    setShowForm(false);
    setError(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      resort_id: formState.resort_id,
      use_year: formState.use_year,
      contract_year: Number(formState.contract_year),
      points_owned: Number(formState.points_owned),
      points_available: Number(formState.points_available),
      points_reserved: Number(formState.points_reserved),
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

  async function handleAddPoints(membershipId: string) {
    const delta = Number(deltaByMembership[membershipId] ?? 0);
    if (!delta || delta <= 0) {
      setError("Enter a positive points adjustment.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await adjustOwnerMembershipPoints(membershipId, delta);
    if (!result.ok) {
      setError(result.error ?? "Unable to adjust points.");
    } else {
      setDeltaByMembership((prev) => ({ ...prev, [membershipId]: "" }));
    }
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
              onChange={(event) => setFormState((prev) => ({ ...prev, use_year: event.target.value }))}
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contract year</label>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.contract_year}
              onChange={(event) => setFormState((prev) => ({ ...prev, contract_year: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Points owned</label>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.points_owned}
              onChange={(event) => setFormState((prev) => ({ ...prev, points_owned: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Points available</label>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.points_available}
              onChange={(event) => setFormState((prev) => ({ ...prev, points_available: event.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Points reserved</label>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.points_reserved}
              onChange={(event) => setFormState((prev) => ({ ...prev, points_reserved: event.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Purchase channel</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.purchase_channel}
              onChange={(event) => setFormState((prev) => ({ ...prev, purchase_channel: event.target.value }))}
              required
            >
              <option value="unknown">Unknown</option>
              <option value="direct">Direct</option>
              <option value="resale">Resale</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Acquired date</label>
            <input
              type="date"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={formState.acquired_at}
              onChange={(event) => setFormState((prev) => ({ ...prev, acquired_at: event.target.value }))}
              required={formState.purchase_channel === "resale"}
            />
            {formState.purchase_channel === "resale" && !formState.acquired_at ? (
              <p className="mt-2 text-xs text-amber-700">Required for resale memberships.</p>
            ) : null}
          </div>

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
          memberships.map((membership) => {
            const resortCode = membership.resort?.calculator_code ?? membership.home_resort ?? "—";
            const resortName = membership.resort?.name ?? "Resort TBD";
            const needsMapping = !membership.resort_id && Boolean(membership.home_resort);
            const createdAt = formatUtcDate(membership.created_at ?? null);

            return (
              <div key={membership.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {resortName} {resortCode ? `(${resortCode})` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Use year: {membership.use_year ?? "—"} · Contract year: {membership.contract_year ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500">Created: {createdAt}</p>
                    {needsMapping ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Needs resort mapping
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {needsMapping ? (
                      <Button type="button" variant="ghost" onClick={() => handleFixMapping(membership.id)} disabled={pending}>
                        Fix mapping
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" onClick={() => startEdit(membership)}>
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Owned" value={membership.points_owned ?? 0} />
                  <Stat label="Available" value={membership.points_available ?? 0} />
                  <Stat label="Reserved" value={membership.points_reserved ?? 0} />
                  <Stat label="Rented" value={membership.points_rented ?? 0} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Channel: {membership.purchase_channel ?? "unknown"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Acquired: {membership.acquired_at ? formatUtcDate(membership.acquired_at) : "—"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="+ Points"
                      value={deltaByMembership[membership.id] ?? ""}
                      onChange={(event) =>
                        setDeltaByMembership((prev) => ({ ...prev, [membership.id]: event.target.value }))
                      }
                    />
                    <Button type="button" onClick={() => handleAddPoints(membership.id)} disabled={pending}>
                      Add points
                    </Button>
                  </div>
                </div>
              </div>
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
