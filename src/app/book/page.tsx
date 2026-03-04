import { redirect } from "next/navigation";

import BookingFlowClient from "@/app/book/BookingFlowClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCanonicalResorts } from "@/lib/resorts/getResorts";

type SearchParams = {
  quote?: string | string[];
};

const fallbackPrefill = {
  resortId: "UNKNOWN",
  resortName: "DVC Resort",
  villaType: "Villa",
  checkIn: "",
  checkOut: "",
  points: 0,
  estCash: 0,
};

export default async function BookingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const quote = resolvedSearchParams.quote;
  const quoteToken = Array.isArray(quote) ? quote[0] : quote;

  if (!quoteToken) {
    redirect("/calculator");
  }

  const supabase = await createSupabaseServerClient();
  const resorts = await getCanonicalResorts(
    supabase as unknown as Parameters<typeof getCanonicalResorts>[0],
    {
    select: "id, name, slug",
    },
  );

  return (
    <div className="min-h-screen bg-surface text-ink">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <BookingFlowClient prefill={fallbackPrefill} resorts={resorts} quoteToken={quoteToken} />
      </main>
    </div>
  );
}
