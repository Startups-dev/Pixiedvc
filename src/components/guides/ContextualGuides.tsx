import { SectionHeader } from "@pixiedvc/design-system";
import type { GuideMeta } from "@/lib/guides";
import { getContextualGuides } from "@/lib/guides";
import GuideGrid from "@/components/guides/GuideGrid";

type ContextualGuidesProps = {
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  limit?: number;
  exclude?: string;
};

export default async function ContextualGuides({
  title,
  description,
  tags,
  category,
  limit = 3,
  exclude,
}: ContextualGuidesProps) {
  const guides = await getContextualGuides({ tags, category, limit, exclude });

  if (guides.length === 0) return null;

  return (
    <section className="mt-16">
      <SectionHeader eyebrow="Guides" title={title} description={description} />
      <div className="mt-10">
        <GuideGrid guides={guides as GuideMeta[]} />
      </div>
    </section>
  );
}
