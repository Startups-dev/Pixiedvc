"use client";

import { useMemo, useState } from "react";

import resortPhotoPrefixes from "@/lib/resort-photo-prefixes.json";
import { buildSupabasePublicUrl } from "@/lib/storage";

type Props = {
  slugs: string[];
};

const BUCKET = "resorts";

function derivePrefix(slug: string) {
  return slug.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

export default function ResortPhotoSqlBuilder({ slugs }: Props) {
  const sortedSlugs = useMemo(() => [...slugs].sort(), [slugs]);
  const initialSlug = sortedSlugs.includes("animal-kingdom-lodge")
    ? "animal-kingdom-lodge"
    : sortedSlugs[0] ?? "";
  const [slug, setSlug] = useState(initialSlug);
  const [prefix, setPrefix] = useState(
    (resortPhotoPrefixes as Record<string, string>)[initialSlug] ?? derivePrefix(initialSlug),
  );
  const [includeAltCaption, setIncludeAltCaption] = useState(true);

  const [paths, setPaths] = useState(() =>
    Array.from({ length: 5 }, (_, index) => `${initialSlug}/${prefix}${index + 1}.png`),
  );

  function updatePaths(nextSlug: string, nextPrefix: string) {
    setPaths(
      Array.from({ length: 5 }, (_, index) => `${nextSlug}/${nextPrefix}${index + 1}.png`),
    );
  }

  function handleSlugChange(nextSlug: string) {
    const nextPrefix =
      (resortPhotoPrefixes as Record<string, string>)[nextSlug] ?? derivePrefix(nextSlug);
    setSlug(nextSlug);
    setPrefix(nextPrefix);
    updatePaths(nextSlug, nextPrefix);
  }

  function handlePrefixChange(nextPrefix: string) {
    setPrefix(nextPrefix);
    updatePaths(slug, nextPrefix);
  }

  const sql = useMemo(() => {
    if (!slug) {
      return "";
    }

    const columns = includeAltCaption
      ? "(resort_slug, url, alt, caption, sort_order)"
      : "(resort_slug, url, sort_order)";

    const values = paths.map((path, index) => {
      const url = buildSupabasePublicUrl(BUCKET, path);
      const order = index + 1;
      const alt = `${slug} photo ${order}`;
      const caption = `Resort photo ${order}`;

      if (includeAltCaption) {
        return `('${escapeSql(slug)}', '${escapeSql(url)}', '${escapeSql(alt)}', '${escapeSql(caption)}', ${order})`;
      }

      return `('${escapeSql(slug)}', '${escapeSql(url)}', ${order})`;
    });

    return `insert into public.resort_photos ${columns}\nvalues\n  ${values.join(",\n  ")};`;
  }, [includeAltCaption, paths, slug]);

  function handleCopy() {
    if (!sql) {
      return;
    }
    void navigator.clipboard.writeText(sql);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Resort slug
          </label>
          <select
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
          >
            {sortedSlugs.map((resortSlug) => (
              <option key={resortSlug} value={resortSlug}>
                {resortSlug}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Prefix
          </label>
          <input
            value={prefix}
            onChange={(event) => handlePrefixChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Storage object paths</p>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={includeAltCaption}
              onChange={(event) => setIncludeAltCaption(event.target.checked)}
            />
            Include alt/caption columns
          </label>
        </div>
        <div className="grid gap-3">
          {paths.map((path, index) => (
            <div key={`${path}-${index}`} className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Photo {index + 1}</label>
              <input
                value={path}
                onChange={(event) => {
                  const next = [...paths];
                  next[index] = event.target.value;
                  setPaths(next);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              />
              <p className="text-[11px] text-slate-400">
                {buildSupabasePublicUrl(BUCKET, path) || "Missing NEXT_PUBLIC_SUPABASE_URL"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_14px_50px_rgba(15,23,42,0.22)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">SQL insert</p>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Copy SQL
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-white/80">{sql}</pre>
      </div>
    </div>
  );
}
