"use client";

import { useMemo, useState } from "react";

export type AffiliateRow = {
  id: string;
  display_name: string;
  email: string;
  website: string | null;
  social_links: string[] | null;
  promotion_description: string | null;
  traffic_estimate: string | null;
  slug: string;
  referral_code: string | null;
  status: string;
  tier: string;
  commission_rate: number;
  auth_user_id: string | null;
  suspend_reason: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
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
  website: string;
  trafficEstimate: string;
  promotionDescription: string;
  socialLink: string;
  suspendReason: string;
  reviewNotes: string;
};

const emptyForm: FormState = {
  displayName: "",
  email: "",
  slug: "",
  referralCode: "",
  commissionRate: "0.06",
  status: "pending_review",
  tier: "basic",
  authUserId: "",
  website: "",
  trafficEstimate: "",
  promotionDescription: "",
  socialLink: "",
  suspendReason: "",
  reviewNotes: "",
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
      commissionRate: String(row.commission_rate ?? 0.06),
      status: row.status,
      tier: row.tier,
      authUserId: row.auth_user_id ?? "",
      website: row.website ?? "",
      trafficEstimate: row.traffic_estimate ?? "",
      promotionDescription: row.promotion_description ?? "",
      socialLink: Array.isArray(row.social_links) ? row.social_links[0] ?? "" : "",
      suspendReason: row.suspend_reason ?? "",
      reviewNotes: row.review_notes ?? "",
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
      website: form.website.trim() || null,
      traffic_estimate: form.trafficEstimate.trim() || null,
      promotion_description: form.promotionDescription.trim() || null,
      social_links: form.socialLink.trim() ? [form.socialLink.trim()] : [],
      suspend_reason: form.suspendReason.trim() || null,
      review_notes: form.reviewNotes.trim() || null,
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
        <h2 className="text-lg font-semibold" style={{ color: "#64748b" }}>Affiliates</h2>
        <div className="space-y-3 text-sm text-[#b4b4b4]">
          {sorted.length === 0 ? (
            <p>No affiliates yet.</p>
          ) : (
            sorted.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => startEdit(row)}
                className="w-full rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4 text-left hover:border-[#4a4a4a]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#ececec]">{row.display_name}</span>
                  <span className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#b4b4b4]">
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-[#8e8ea0]">/{row.slug} · {row.email}</p>
                {row.traffic_estimate ? (
                  <p className="text-xs text-[#8e8ea0]">Traffic: {row.traffic_estimate}</p>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "#64748b" }}>{form.id ? "Edit affiliate" : "New affiliate"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-[#b4b4b4]">
          <label className="flex flex-col gap-1">
            Display name
            <input
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Slug
            <input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec] placeholder:text-[#8e8ea0]"
              placeholder="your-name"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            Referral code (optional)
            <input
              value={form.referralCode}
              onChange={(event) => setForm({ ...form, referralCode: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Commission rate
              <input
                value={form.commissionRate}
                onChange={(event) => setForm({ ...form, commissionRate: event.target.value })}
                className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              />
            </label>
            <label className="flex flex-col gap-1">
              Tier
              <input
                value={form.tier}
                onChange={(event) => setForm({ ...form, tier: event.target.value })}
                className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              >
                <option value="pending_review">Pending review</option>
                <option value="verified">Verified</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Auth user id (optional)
              <input
                value={form.authUserId}
                onChange={(event) => setForm({ ...form, authUserId: event.target.value })}
                className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec] placeholder:text-[#8e8ea0]"
                placeholder="UUID"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            Website
            <input
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
            />
          </label>
          <label className="flex flex-col gap-1">
            Social link
            <input
              value={form.socialLink}
              onChange={(event) => setForm({ ...form, socialLink: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
            />
          </label>
          <label className="flex flex-col gap-1">
            Traffic estimate
            <input
              value={form.trafficEstimate}
              onChange={(event) => setForm({ ...form, trafficEstimate: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
            />
          </label>
          <label className="flex flex-col gap-1">
            Promotion description
            <textarea
              value={form.promotionDescription}
              onChange={(event) => setForm({ ...form, promotionDescription: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              rows={3}
            />
          </label>
          <label className="flex flex-col gap-1">
            Review notes
            <textarea
              value={form.reviewNotes}
              onChange={(event) => setForm({ ...form, reviewNotes: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
              rows={3}
            />
          </label>
          <label className="flex flex-col gap-1">
            Suspend reason (required when suspended)
            <input
              value={form.suspendReason}
              onChange={(event) => setForm({ ...form, suspendReason: event.target.value })}
              className="rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-[#ececec]"
            />
          </label>
          {form.id ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300"
                onClick={() =>
                  setForm({
                    ...form,
                    status: "verified",
                    tier: "verified",
                    commissionRate: "0.07",
                  })
                }
              >
                Upgrade to verified
              </button>
              <button
                type="button"
                className="rounded-2xl border border-sky-500/30 bg-sky-900/20 px-3 py-2 text-xs font-semibold text-sky-300"
                onClick={() =>
                  setForm({
                    ...form,
                    status: "verified",
                    tier: "elite",
                    commissionRate: "0.08",
                  })
                }
              >
                Upgrade to elite
              </button>
              <button
                type="button"
                className="rounded-2xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-xs font-semibold text-[#b4b4b4]"
                onClick={() =>
                  setForm({
                    ...form,
                    status: "pending_review",
                    tier: "basic",
                    commissionRate: "0.06",
                  })
                }
              >
                Leave as basic
              </button>
              <button
                type="button"
                className="rounded-2xl border border-amber-500/30 bg-amber-900/20 px-3 py-2 text-xs font-semibold text-amber-300"
                onClick={() => setForm({ ...form, status: "suspended" })}
              >
                Suspend
              </button>
              <button
                type="button"
                className="rounded-2xl border border-rose-500/30 bg-rose-900/20 px-3 py-2 text-xs font-semibold text-rose-300"
                onClick={() => setForm({ ...form, status: "rejected", tier: "basic" })}
              >
                Reject
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-[#10a37f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d8c6d]"
            disabled={saving}
          >
            {saving ? "Saving…" : form.id ? "Update affiliate" : "Create affiliate"}
          </button>

          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
