"use client";

import { useMemo, useState } from "react";

import type { Testimonial } from "@/lib/testimonials";
import { TESTIMONIALS } from "@/lib/testimonials";

type Props = {
  title?: string;
  subtitle?: string;
  initialCount?: number;
  showForm?: boolean;
  testimonials?: Testimonial[];
};

type FormState = {
  name: string;
  location: string;
  quote: string;
  email: string;
  consent: boolean;
};

export default function TestimonialsSection({
  title = "What Guests Are Saying",
  subtitle = "Families who wanted clarity, calm, and confidence.",
  initialCount = 9,
  showForm = true,
  testimonials = TESTIMONIALS,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
    location: "",
    quote: "",
    email: "",
    consent: false,
  });

  const visibleTestimonials = useMemo(
    () => testimonials.slice(0, Math.max(0, Math.min(initialCount, testimonials.length))),
    [initialCount, testimonials],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const payload = {
      author: form.name.trim(),
      location: form.location.trim(),
      quote: form.quote.trim(),
      email: form.email.trim() || undefined,
      consent: form.consent,
    };

    try {
      const response = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus("error");
        setErrorMessage(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setForm({
        name: "",
        location: "",
        quote: "",
        email: "",
        consent: false,
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-[#0F2148]">{title}</h2>
        <p className="text-sm text-[#0F2148]/70">{subtitle}</p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleTestimonials.map((testimonial, index) => (
          <div
            key={`${testimonial.author}-${testimonial.location}-${index}`}
            className="rounded-3xl border border-slate-200/70 bg-slate-50 p-6 md:p-7"
          >
            <p className="text-base leading-7 text-slate-900">“{testimonial.quote}”</p>
            <p className="mt-4 text-sm text-slate-600">
              {testimonial.author} · {testimonial.location}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-6">
        <p className="text-sm text-slate-700">
          Have a great stay? Share your experience — every submission is reviewed before being published.
        </p>
        {showForm ? (
          <button
            type="button"
            onClick={() => setIsFormOpen((open) => !open)}
            className="inline-flex w-fit items-center justify-center rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Share your experience
          </button>
        ) : null}
      </div>

      {showForm && isFormOpen ? (
        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Location</span>
                <input
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Testimonial</span>
              <textarea
                value={form.quote}
                onChange={(event) => setForm((prev) => ({ ...prev, quote: event.target.value }))}
                required
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Email (optional)</span>
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(event) => setForm((prev) => ({ ...prev, consent: event.target.checked }))}
                required
                className="mt-1"
              />
              <span>I agree PixieDVC may display my testimonial publicly after review.</span>
            </label>
            <p className="text-xs text-slate-500">
              Please don’t include links. Submissions with links may be rejected.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "submitting" ? "Submitting..." : "Submit testimonial"}
              </button>
              {status === "success" ? (
                <span className="text-sm text-emerald-600">Thanks for sharing. We’ll review it soon.</span>
              ) : null}
              {status === "error" ? (
                <span className="text-sm text-rose-600">{errorMessage}</span>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
