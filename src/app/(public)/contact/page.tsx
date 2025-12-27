import { Card, FieldLabel, TextArea, TextInput, Button } from "@pixiedvc/design-system";
import { SiteHeader } from "@/components/site-header";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <SiteHeader variant="solid" />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[40%] top-[-15%] h-[360px] w-[360px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-10%] top-[35%] h-[320px] w-[320px] rounded-full bg-lavender/40 blur-3xl" />
        </div>
        <main className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted shadow-sm backdrop-blur">
              Concierge Team
            </span>
            <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
              We are one message away from sprinkling pixie dust on your plans.
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Owners, guests, and partners receive responses within 24 hours (often much faster). Share a few
              details and we will route your note to the right concierge.
            </p>
            <Card className="bg-white/85">
              <p className="text-sm text-muted">Prefer email?</p>
              <p className="mt-2 text-lg font-semibold text-ink">concierge@pixiedvc.com</p>
              <p className="text-lg font-semibold text-ink">owners@pixiedvc.com</p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Mon–Sat · 8a – 8p ET</p>
            </Card>
          </div>
          <Card className="bg-white/90">
            <form className="space-y-6">
              <div>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <TextInput id="name" placeholder="Tiana Rivera" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <TextInput id="email" type="email" placeholder="tiana@baylakeclub.com" />
                </div>
                <div>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <select
                    id="role"
                    className="mt-2 w-full rounded-2xl border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="guest">Guest</option>
                    <option value="owner">Owner</option>
                    <option value="partner">Partner</option>
                    <option value="press">Press</option>
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="message">How can we help?</FieldLabel>
                <TextArea id="message" rows={5} placeholder="Share details about your stay or question." />
              </div>
              <Button type="submit">Send Message</Button>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}
