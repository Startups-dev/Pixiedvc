import { Suspense } from "react";
import { Card, SectionHeader } from "@pixiedvc/design-system";
import CalculatorClient from "@/app/(public)/calculator/CalculatorClient";
import ContextualGuides from "@/components/guides/ContextualGuides";

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <main className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeader
          eyebrow="Pricing Calculator"
          title="Estimate your DVC stay"
          description="Choose your resort, dates, and room type to see an instant point total and estimated cost."
        />
        <Card className="mt-10 bg-white/90">
          <Suspense fallback={null}>
            <CalculatorClient />
          </Suspense>
        </Card>
        <ContextualGuides
          title="Learn the basics"
          description="Quick reads to help you understand points, pricing, and the booking flow."
          tags={["points", "calculator"]}
          category="DVC Basics"
          limit={3}
        />
      </main>
    </div>
  );
}
