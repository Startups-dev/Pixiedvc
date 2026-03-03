import { requireAdminUser } from "@/lib/admin";
import { getAllResortSlugs } from "@/lib/resorts";

import ResortPhotoSqlBuilder from "./ResortPhotoSqlBuilder";

export const dynamic = "force-dynamic";

export default async function ResortPhotosToolPage() {
  await requireAdminUser("/admin/tools/resort-photos");
  const slugs = await getAllResortSlugs();

  return (
    <main className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12 text-[#ececec]">
      <header className="space-y-3">
        <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">Admin</a>
        <h1 className="text-2xl font-semibold" style={{ color: '#64748b' }}>Resort photo SQL generator</h1>
        <p className="text-sm text-[#b4b4b4]">
          Generate insert statements for resort photo rows. This tool does not write to Supabase.
        </p>
      </header>

      <ResortPhotoSqlBuilder slugs={slugs} />
      </div>
    </main>
  );
}
