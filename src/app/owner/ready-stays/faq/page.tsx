import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const FAQ_ITEMS = [
  {
    q: "What is a Ready Stay?",
    a: "A Ready Stay is a confirmed Disney reservation you already have. You list it, and a guest can book it instantly without back-and-forth.",
  },
  {
    q: "Why do you ask for my payout per point?",
    a: "That is what you earn per point when the stay sells. PixieDVC adds a separate guest service fee.",
  },
  {
    q: "Why is there a maximum payout?",
    a: "Ready Stays are instant-booking inventory. A max payout prevents extreme pricing that can hurt trust, reduce conversions, and create support issues. You can always price below the max.",
  },
  {
    q: "Can I price lower than the max?",
    a: "Yes. You can price below the max at any time.",
  },
  {
    q: "How is the max payout calculated?",
    a: "We use season-based caps and resort demand adjustments. Max payout = Guest cap − PixieDVC fee.",
  },
  {
    q: "Do guests see my payout or the Pixie fee?",
    a: "No. Guests only see the final guest price.",
  },
  {
    q: "Do different resorts have different max payouts?",
    a: "Yes. Higher-demand resorts may allow a higher cap for the same dates.",
  },
  {
    q: "What dates count as special pricing?",
    a: "Major holiday windows and peak demand periods, like Christmas week, run events, and spring break. The pricing tool detects this automatically from your dates.",
  },
  {
    q: "What do I need to list?",
    a: "Resort, room type, check-in and check-out dates, points, and your confirmation number so we can verify.",
  },
  {
    q: "What happens after it sells?",
    a: "You get next-step instructions for transfer and verification, and the sale progresses through statuses on your inventory page.",
  },
];

export default async function ReadyStaysFaqPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/ready-stays/faq");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <Link href="/owner/ready-stays" className="text-sm font-semibold text-brand hover:underline">
        Back to Ready Stays
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Ready Stays FAQ</h1>
        <p className="text-sm text-muted">
          Ready Stays let you list a confirmed DVC reservation so guests can book instantly. Here is how
          it works, how pricing works, and what to expect.
        </p>
      </div>

      <Card className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink">{item.q}</summary>
            <p className="mt-2 text-sm text-slate-600">{item.a}</p>
          </details>
        ))}
      </Card>
    </div>
  );
}
