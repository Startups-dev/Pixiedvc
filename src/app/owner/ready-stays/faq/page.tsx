import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const FAQ_ITEMS = [
  {
    q: "What is a Ready Stay?",
    a: "A Ready Stay is a confirmed Disney reservation you already have. You list it, and a guest can book it instantly without back-and-forth.",
  },
  {
    q: "Why do you ask for my payout per point?",
    a: "That is what you earn per point when the stay sells. HannaDVC adds a separate guest service fee.",
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
    a: "We use season-based caps and resort demand adjustments. Max payout = Guest cap − HannaDVC fee.",
  },
  {
    q: "Do guests see my payout or the HannaDVC fee?",
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
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner resources"
        title="Ready Stays FAQ"
        description="Review how Ready Stays work, how owner payout pricing is presented, and what to expect after a listing sells."
        summary="Owner resource"
      />

      <Card className="space-y-3 rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="rounded-[14px] border border-[#ECECE8] bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#10224A]">{item.q}</summary>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{item.a}</p>
          </details>
        ))}
      </Card>

      <Link href="/owner/ready-stays" className="inline-flex text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
        Back to Ready Stays
      </Link>
    </div>
  );
}
