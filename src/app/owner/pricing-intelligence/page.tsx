import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import PricingIntelligenceClient from "./PricingIntelligenceClient";

type ResortOption = {
  id: string;
  name: string;
  calculator_code: string | null;
};

export default async function PricingIntelligencePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/owner/pricing-intelligence");

  const { data: resorts } = await supabase
    .from("resorts")
    .select("id, name, calculator_code")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">
          Pricing Intelligence
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Ready Stay Cap Calculator
        </h1>
        <p className="text-sm text-muted">
          Understand seasonal caps, resort demand modifiers, and suggested owner payouts.
        </p>
      </div>

      <PricingIntelligenceClient resorts={(resorts ?? []) as ResortOption[]} />
    </div>
  );
}
