"use client";

import { useMemo, useState } from "react";
import { Button, FieldLabel, TextArea, TextInput } from "@pixiedvc/design-system";

type PartnershipType = "advisor" | "affiliate" | "service";

type ApplyResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

const FIELD_CONTROL =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 shadow-sm " +
  "placeholder:text-slate-400 transition-colors " +
  "hover:border-slate-400 hover:ring-slate-300 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-0 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export default function PartnerApplyForm({ initialType }: { initialType: PartnershipType }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partnershipType, setPartnershipType] = useState<PartnershipType>(initialType);
  const [businessName, setBusinessName] = useState("");
  const [websiteOrSocial, setWebsiteOrSocial] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      businessName.trim().length > 0 &&
      description.trim().length > 0 &&
      !submitting
    );
  }, [name, email, businessName, description, submitting]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || null,
          partnershipType,
          businessName,
          websiteOrSocial: websiteOrSocial.trim() || null,
          description,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ApplyResponse;
      if (!response.ok) {
        setError(payload.error ?? "Unable to submit application.");
        return;
      }

      setSuccess(payload.message ?? "Application submitted.");
      setName("");
      setEmail("");
      setPhone("");
      setBusinessName("");
      setWebsiteOrSocial("");
      setDescription("");
      setPartnershipType(initialType);
    } catch {
      setError("Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <FieldLabel htmlFor="partner-name">Name</FieldLabel>
        <TextInput
          id="partner-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={FIELD_CONTROL}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="partner-email">Email</FieldLabel>
          <TextInput
            id="partner-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD_CONTROL}
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="partner-phone">Phone (optional)</FieldLabel>
          <TextInput
            id="partner-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={FIELD_CONTROL}
            placeholder="+1 (555) 555-5555"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="partnership-type">Partnership Type</FieldLabel>
          <select
            id="partnership-type"
            value={partnershipType}
            onChange={(event) => setPartnershipType(event.target.value as PartnershipType)}
            className={`${FIELD_CONTROL} appearance-none`}
            required
          >
            <option value="advisor">Travel Advisor / Agency</option>
            <option value="affiliate">Affiliate / Content Creator</option>
            <option value="service">Experience / Service Provider</option>
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="business-name">Business / Brand Name</FieldLabel>
          <TextInput
            id="business-name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className={FIELD_CONTROL}
            placeholder="Business or brand"
            required
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="website-social">Website / Social (optional)</FieldLabel>
        <TextInput
          id="website-social"
          value={websiteOrSocial}
          onChange={(event) => setWebsiteOrSocial(event.target.value)}
          className={FIELD_CONTROL}
          placeholder="https://..."
        />
      </div>

      <div>
        <FieldLabel htmlFor="description">Description / Message</FieldLabel>
        <TextArea
          id="description"
          rows={5}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={FIELD_CONTROL}
          placeholder="Tell us about your audience, business, and partnership goals."
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}

      <Button type="submit" className="!text-white" disabled={!canSubmit}>
        {submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
