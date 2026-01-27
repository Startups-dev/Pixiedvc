import {
  Activity,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  Link as LinkIcon,
  Link as LinkPlain,
  Link2,
  Pen,
  PiggyBank,
  Plane,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import PrimaryCtaLink from "@/components/ui/PrimaryCtaLink";

const portalFeatures = [
  {
    icon: Activity,
    text: "View real-time click and booking activity",
  },
  {
    icon: TrendingUp,
    text: "Track commission status and payout history",
  },
  {
    icon: LinkPlain,
    text: "Access referral links and marketing assets",
  },
  {
    icon: FileText,
    text: "Manage payout details and tax information",
  },
];

const howItWorksSteps = [
  {
    icon: Link2,
    title: "Share your referral link",
    description: "Use your unique tracking link across your website, content, or social channels.",
    bgClass: "bg-feature-1",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Shield,
    title: "Guests book with confidence",
    description: "Referred guests receive the same concierge-led experience, verified inventory, and clear pricing.",
    bgClass: "bg-feature-2",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
  {
    icon: DollarSign,
    title: "Earn commission on completed bookings",
    description: "Commissions are calculated automatically and paid out on a monthly schedule.",
    bgClass: "bg-feature-3",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
];

const targetAudiences = [
  {
    icon: Pen,
    title: "Bloggers and content creators",
  },
  {
    icon: Users,
    title: "Influencers and social publishers",
  },
  {
    icon: PiggyBank,
    title: "Deal and savings platforms",
  },
  {
    icon: Plane,
    title: "Travel and vacation planning sites",
  },
];

export default function AffiliateProgramPage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(226,232,240,0.7),transparent_55%),radial-gradient(circle_at_0%_85%,rgba(203,213,225,0.55),transparent_45%)]" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                <LinkIcon className="h-4 w-4" />
                <span>Affiliate Program</span>
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Earn with every{" "}
                <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-400 bg-clip-text text-transparent">
                  referral
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Refer guests to PixieDVC and earn commissions through a transparent, trackable referral system designed
                for content creators, publishers, and trusted voices in travel.
              </p>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600">
                PixieDVC affiliates receive access to a dedicated portal where every click, booking, and payout is
                clearly tracked. You'll always know how your referrals are performing and when commissions are released.
              </p>

              <div className="mt-8">
                <PrimaryCtaLink href="/affiliate/login">Apply Now</PrimaryCtaLink>
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-slate-200/70 blur-2xl" />

                <div className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    Portal Preview
                  </div>

                  <h3 className="text-2xl font-semibold text-slate-900">
                    Track clicks, bookings, and payouts in one dashboard.
                  </h3>

                  <div className="mt-4 space-y-3 text-slate-600">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-slate-700" />
                      <span>Transparent performance reporting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-slate-700" />
                      <span>Real-time analytics dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-slate-700" />
                      <span>Automated commission tracking</span>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-200 pt-6">
                    <div className="flex h-16 items-end gap-2">
                      {[40, 65, 45, 80, 60, 90, 75].map((height) => (
                        <div
                          key={height}
                          className="flex-1 rounded-t bg-slate-200 transition hover:bg-slate-300"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-secondary/30 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">How it works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Join our affiliate program in three simple steps and start earning commissions on every successful
              referral.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="group relative">
                  {index < howItWorksSteps.length - 1 && (
                    <div className="absolute left-[60%] top-16 hidden h-px w-[80%] bg-border md:block" />
                  )}

                  <div className="relative z-10 h-full rounded-2xl border border-slate-900 bg-[#0F2148] p-8 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                    <div className="absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-4xl font-semibold text-[#0F2148] shadow-soft">
                      {index + 1}
                    </div>

                    <div
                      className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 transition-transform group-hover:scale-110"
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="mb-3 min-h-[56px] text-xl font-semibold leading-snug text-white">{step.title}</h3>
                    <p className="leading-relaxed text-white/80">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border bg-card p-8 shadow-soft lg:p-12">
            <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2 className="mb-6 text-3xl font-bold md:text-4xl">Affiliate Portal Access</h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Once approved, you'll receive access to the PixieDVC Affiliate Portal, where you can:
                </p>
              </div>

              <div className="space-y-4">
                {portalFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.text} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/30">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 flex items-center gap-2 border-t border-border pt-8 text-muted-foreground">
              <span>Already an affiliate?</span>
              <a href="/affiliate/login" className="font-semibold text-foreground transition-colors hover:text-primary">
                Log in.
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/30 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border bg-card p-8 shadow-soft lg:p-12">
            <h2 className="mb-10 text-3xl font-bold md:text-4xl">Who this is for</h2>

            <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {targetAudiences.map((audience) => {
                const Icon = audience.icon;
                return (
                  <div
                    key={audience.title}
                    className="group flex items-center gap-4 rounded-xl border border-border/50 bg-secondary/50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-soft"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-medium">{audience.title}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-8">
              <p className="text-muted-foreground">
                If you're looking for a deeper operational or agency-level collaboration,{" "}
                <a href="/partners/become-a-partner" className="font-semibold text-primary hover:underline underline-offset-4">
                  visit Become a Partner
                </a>{" "}
                instead.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-[#1c2a4a] px-8 py-12 text-center text-white shadow-soft sm:px-12">
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ color: "#fff" }}>
              Ready to start earning?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/80">
              Join our affiliate program today and turn your audience into a revenue stream with transparent tracking
              and reliable payouts.
            </p>
            <div className="mt-8">
              <PrimaryCtaLink href="/affiliate/login">Apply for the Affiliate Program -&gt;</PrimaryCtaLink>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0F2148]">
        <div className="mx-auto max-w-6xl px-6 py-16 text-white">
          <div className="flex flex-col items-start gap-4">
            <h2 className="text-2xl font-semibold">Get Started</h2>
            <p className="text-sm text-white/80">
              Quality-first program. Applications are reviewed and approved before access is granted.
            </p>
            <p className="text-sm text-white/80">Already approved? Log in. New partners apply in minutes.</p>
            <PrimaryCtaLink href="/affiliate/login">Affiliate Login / Apply</PrimaryCtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
