import type { GuideMeta } from "@/lib/guides";
import GuideCard from "@/components/guides/GuideCard";

export default function GuideGrid({ guides }: { guides: GuideMeta[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((guide) => (
        <GuideCard key={guide.slug} guide={guide} />
      ))}
    </div>
  );
}
