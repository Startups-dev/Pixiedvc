import { SectionHeader } from "@pixiedvc/design-system";
import type { GuideMeta } from "@/lib/guides";
import GuideGrid from "@/components/guides/GuideGrid";

export default function RelatedGuides({ guides }: { guides: GuideMeta[] }) {
  if (guides.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader
        eyebrow="Related Guides"
        title="Keep exploring"
        description="More reading based on this guide."
      />
      <div className="mt-8">
        <GuideGrid guides={guides} />
      </div>
    </section>
  );
}
