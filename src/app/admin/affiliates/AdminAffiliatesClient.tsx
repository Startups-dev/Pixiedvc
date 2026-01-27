"use client";

import { useMemo, useState } from "react";

export type AffiliateRow = {
  id: string;
  display_name: string;
  email: string;
  slug: string;
  referral_code: string | null;
  status: string;
  tier: string;
  commission_rate: number;
  auth_user_id: string | null;
  created_at: string;
};

type FormState = {
  id?: string;
  displayName: string;
  email: string;
  slug: string;
  referralCode: string;
  commissionRate: string;
  status: string;
  tier: string;
  authUserId: string;
};

const emptyForm: FormState = {
  displayName: "",
  email: "",
  slug: "",
  referralCode: "",
  commissionRate: "0.07",
  status: "active",
  tier: "standard",
  authUserId: "",
};

export default function AdminAffiliatesClient({ affiliates }: { affiliates: AffiliateRow[] }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(() => [...affiliates].sort((a, b) => a.display_name.localeCompare(b.display_name)), [affiliates]);

  function startEdit(row: AffiliateRow) {
    setForm({
      id: row.id,
      displayName: row.display_name,
      email: row.email,
      slug: row.slug,
      referralCode: row.referral_code ?? "",
      commissionRate: String(row.commission_rate ?? 0.07),
      status: row.status,
      tier: row.tier,
      authUserId: row.auth_user_id ?? "",
    });
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      id: form.id,
      display_name: form.displayName.trim(),
      email: form.email.trim(),
      slug: form.slug.trim(),
      referral_code: form.referralCode.trim() || null,
      commission_rate: Number(form.commissionRate),
      status: form.status,
      tier: form.tier,
      auth_user_id: form.authUserId.trim() || null,
    };

    const response = await fetch("/api/admin/affiliates", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      setMessage("Unable to save affiliate. Double-check fields.");
      return;
    }

    setMessage(form.id ? "Affiliate updated." : "Affiliate created.");
    setForm(emptyForm);
    window.location.reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Affiliates</h2>
        <div className="space-y-3 text-sm text-slate-600">
          {sorted.length === 0 ? (
            <p>No affiliates yet.</p>
          ) : (
            sorted.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => startEdit(row)}
                className="w-full rounded-2xl border border-slate-100 p-4 text-left hover:border-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{row.display_name}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">/{row.slug} · {row.email}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{form.id ? "Edit affiliate" : "New affiliate"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-700">
          <label className="flex flex-col gap-1">
            Display name
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Slug
            <input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
              placeholder="your-name"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Referral code (optional)
            <input
              value={form.referralCode}
              onChange={(event) => setForm({ ...form, referralCode: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Commission rate
              <input
                value={form.commissionRate}
                onChange={(event) => setForm({ ...form, commissionRate: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              Tier
              <input
                value={form.tier}
                onChange={(event) => setForm({ ...form, tier: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Auth user id (optional)
              <input
                value={form.authUserId}
                onChange={(event) => setForm({ ...form, authUserId: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
                placeholder="UUID"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            disabled={saving}
          >
            {saving ? "Saving…" : form.id ? "Update affiliate" : "Create affiliate"}
          </button>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
