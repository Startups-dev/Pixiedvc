import PartnerApplyForm from "./PartnerApplyForm";

type PartnershipType = "advisor" | "affiliate" | "service";

function normalizeType(value?: string | null): PartnershipType {
  if (value === "affiliate") return "affiliate";
  if (value === "service") return "service";
  return "advisor";
}

export default async function PartnersApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const partnershipType = normalizeType(params?.type);

  return (
    <main className="min-h-screen bg-white text-[#0F2148]">
      <section className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[#0F2148]">Partner Application</h1>
          <p className="text-base text-[#0F2148]/75">
            Tell us about your business and partnership goals. We&apos;ll review your application and follow up with
            next steps.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <PartnerApplyForm initialType={partnershipType} />
        </div>
      </section>
    </main>
  );
}
