import SupportPanel from "@/components/support/SupportPanel";
import { loadSupportDocs } from "@/lib/support/kb";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default async function SupportPage() {
  const docs = await loadSupportDocs();
  const categories = Array.from(
    new Set(docs.map((doc) => doc.meta.category)),
  ).sort();

  const faqsByCategory = categories.map((category) => ({
    category,
    id: slugify(category),
    faqs: docs
      .filter((doc) => doc.meta.category === category)
      .flatMap((doc) => doc.meta.faqs ?? []),
  }));

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Support
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Frequently Asked Questions
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            A quick guide to booking, pricing, and resort logistics. Answers are
            sourced directly from PixieDVC help docs.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            <div className="flex flex-wrap gap-2">
              {faqsByCategory.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
                >
                  {item.category}
                </a>
              ))}
            </div>

            {faqsByCategory.map((group) => (
              <section key={group.id} id={group.id} className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">
                  {group.category}
                </h2>
                <div className="space-y-3">
                  {group.faqs.map((faq) => (
                    <details
                      key={faq.question}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                        {faq.question}
                      </summary>
                      <p className="mt-2 text-sm text-slate-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="lg:sticky lg:top-24">
            <SupportPanel categories={categories} variant="light" />
          </div>
        </div>
      </div>
    </div>
  );
}
