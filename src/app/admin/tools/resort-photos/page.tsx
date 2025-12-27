import { requireAdminUser } from "@/lib/admin";
import { getAllResortSlugs } from "@/lib/resorts";

import ResortPhotoSqlBuilder from "./ResortPhotoSqlBuilder";

export const dynamic = "force-dynamic";

export default async function ResortPhotosToolPage() {
  await requireAdminUser("/admin/tools/resort-photos");
  const slugs = await getAllResortSlugs();

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin Tools</p>
        <h1 className="text-2xl font-semibold text-slate-900">Resort photo SQL generator</h1>
        <p className="text-sm text-slate-600">
          Generate insert statements for resort photo rows. This tool does not write to Supabase.
        </p>
      </header>

      <ResortPhotoSqlBuilder slugs={slugs} />
    </main>
  );
}
