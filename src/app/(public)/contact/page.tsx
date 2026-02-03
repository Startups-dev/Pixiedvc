import Link from "next/link";

import { Button, Card, FieldLabel, TextArea, TextInput } from "@pixiedvc/design-system";

export default function ContactPage() {
  const control =
    "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 shadow-sm " +
    "placeholder:text-slate-400 transition-colors " +
    "hover:border-slate-400 hover:ring-slate-300 " +
    "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-0 " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[40%] top-[-15%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-10%] top-[35%] h-[320px] w-[320px] rounded-full bg-lavender/40 blur-3xl" />
        </div>
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted shadow-sm backdrop-blur">
                Concierge Team
              </span>
              <h1 className="font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
                We’re one message away from your perfect DVC stay.
              </h1>
              <div className="max-w-prose space-y-3 text-base text-slate-600 sm:text-lg">
                <p>In a rush? Start a live chat with a PixieDVC concierge — responses are often immediate.</p>
                <p>Not urgent? Send us a message and we’ll follow up the same day.</p>
                <p>Owners, guests, and partners are routed to the right concierge with clear next steps.</p>
              </div>
              <p className="text-sm text-slate-500">
                If we’re offline, all messages are reviewed and answered promptly.
              </p>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prefer email?</p>
                <p className="text-base font-semibold text-ink">hello@pixiedvc.com</p>
              </div>
            </div>

            <Card className="bg-white/90">
              <form className="space-y-6">
                <div>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <TextInput id="name" className={control} placeholder="Mickey Mouse" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <TextInput id="email" type="email" className={control} placeholder="mickey@pixiedvc.com" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="role">I am a</FieldLabel>
                    <select id="role" className={`${control} appearance-none`}>
                      <option value="guest">Guest</option>
                      <option value="owner">Owner</option>
                      <option value="partner">Partner</option>
                    </select>
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="message">How can we help?</FieldLabel>
                  <TextArea
                    id="message"
                    rows={5}
                    className={control}
                    placeholder="Tell us about your stay, dates, or what you’d like help with."
                  />
                </div>
                <Button type="submit">Send Message</Button>
              </form>
            </Card>
          </div>

          <section className="mt-12 rounded-[32px] bg-gradient-to-r from-[#0b1224] via-[#151c38] to-[#2b3a70] p-8 text-white shadow-[0_30px_70px_rgba(11,14,26,0.25)]">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  Affiliates & Partners
                </p>
                <h2 className="font-display text-2xl !text-slate-500 sm:text-3xl">
                  Earn up to 8% referring DVC bookings.
                </h2>
                <p className="max-w-prose text-sm text-white sm:text-base">
                  Transparent tracking. Monthly payouts. See every click, booking, and commission in real time.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <Link href="/affiliate/login" className="text-sm font-semibold text-white/80 hover:text-white">
                  Learn about our affiliate program →
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
