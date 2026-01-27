import type { ReactNode } from "react";

import fs from "node:fs/promises";
import path from "node:path";

import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";

import { mdxComponents } from "@/lib/mdx";
import { supabaseServer } from "@/lib/supabase-server";

export type GuideStatus = "draft" | "published";

export type GuideRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  hero_image_url: string | null;
  reading_time_minutes: number | null;
  status: GuideStatus;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  view_count: number | null;
  featured_homepage: boolean | null;
  homepage_feature_order: number | null;
  featured_guides_page: boolean | null;
  guides_page_feature_order: number | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
};

export type GuideMeta = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  heroImage: string | null;
  readingTime: number;
  publishedAt: string;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
};

export type GuideDetail = {
  guide: GuideMeta;
  content: ReactNode;
  toc: GuideTocItem[];
};

export type GuideSortMode = "helpful" | "newest" | "views";
export type GuideTocItem = { id: string; title: string; level: 2 | 3 };

const DEFAULT_READING_TIME = 1;
const GUIDES_DIR = path.join(process.cwd(), "content/guides");

type MdxGuide = {
  meta: GuideMeta;
  content: string;
};

function mapGuideRow(row: GuideRow): GuideMeta {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? row.meta_description ?? "",
    category: row.category ?? "General",
    tags: row.tags ?? [],
    heroImage: row.hero_image_url,
    readingTime: row.reading_time_minutes ?? DEFAULT_READING_TIME,
    publishedAt: row.published_at ?? row.created_at ?? new Date().toISOString(),
    viewCount: row.view_count ?? 0,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    ogImageUrl: row.og_image_url,
  };
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function buildToc(source: string): GuideTocItem[] {
  const toc: GuideTocItem[] = [];
  const lines = source.split("\n");
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2?.[1]) {
      const title = h2[1].trim();
      toc.push({ id: slugifyHeading(title), title, level: 2 });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)/);
    if (h3?.[1]) {
      const title = h3[1].trim();
      toc.push({ id: slugifyHeading(title), title, level: 3 });
    }
  }
  return toc;
}

export function computeReadingTime(text: string) {
  const words = text.match(/\b\w+\b/g)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatGuideDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

async function compileGuideContent(source: string) {
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false },
    components: mdxComponents,
  });
  return content;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function loadMdxGuides(): Promise<MdxGuide[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(GUIDES_DIR);
  } catch {
    return [];
  }

  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  const guides = await Promise.all(
    mdxFiles.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(GUIDES_DIR, file);
      const source = await fs.readFile(filePath, "utf8");
      const { data, content } = matter(source);
      const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
      const publishedAt = typeof data.date === "string" ? data.date : new Date().toISOString();
      const meta: GuideMeta = {
        id: slug,
        title: typeof data.title === "string" ? data.title : slug,
        slug,
        excerpt: typeof data.description === "string" ? data.description : "",
        category: typeof data.category === "string" ? data.category : "General",
        tags,
        heroImage: typeof data.hero === "string" ? data.hero : null,
        readingTime: computeReadingTime(content),
        publishedAt,
        viewCount: 0,
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        ogImageUrl: null,
      };
      return { meta, content };
    })
  );

  return guides.sort(
    (a, b) => new Date(b.meta.publishedAt).getTime() - new Date(a.meta.publishedAt).getTime()
  );
}

async function getMdxGuideBySlug(slug: string): Promise<GuideDetail | null> {
  const guides = await loadMdxGuides();
  const match = guides.find((guide) => guide.meta.slug === slug);
  if (!match) return null;
  const content = await compileGuideContent(match.content);
  return {
    guide: match.meta,
    content,
    toc: buildToc(match.content),
  };
}

async function getMdxGuidesMeta() {
  const guides = await loadMdxGuides();
  return guides.map((guide) => guide.meta);
}

export async function getGuideBySlug(slug: string): Promise<GuideDetail | null> {
  if (!isSupabaseConfigured()) {
    return getMdxGuideBySlug(slug);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn(`[guides] Failed to load guide ${slug}`, error);
    }
    return getMdxGuideBySlug(slug);
  }

  const row = data as GuideRow;
  const contentSource = row.content ?? "";
  const content = await compileGuideContent(contentSource);
  const readingTime = row.reading_time_minutes ?? computeReadingTime(contentSource);

  return {
    guide: {
      ...mapGuideRow({ ...row, reading_time_minutes: readingTime }),
      readingTime,
    },
    content,
    toc: buildToc(contentSource),
  };
}

export async function getHomepageFeaturedGuides(limit = 5) {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    return guides.slice(0, limit);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published")
    .eq("featured_homepage", true)
    .order("homepage_feature_order", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn("[guides] Failed to load homepage guides", error);
    const guides = await getMdxGuidesMeta();
    return guides.slice(0, limit);
  }

  return (data as GuideRow[]).map(mapGuideRow);
}

export async function getFeaturedGuides(limit = 6) {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    return guides.slice(0, limit);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published")
    .eq("featured_guides_page", true)
    .order("guides_page_feature_order", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn("[guides] Failed to load featured guides", error);
    const guides = await getMdxGuidesMeta();
    return guides.slice(0, limit);
  }

  return (data as GuideRow[]).map(mapGuideRow);
}

export async function getAllGuides() {
  if (!isSupabaseConfigured()) {
    return getMdxGuidesMeta();
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.warn("[guides] Failed to load guides", error);
    return getMdxGuidesMeta();
  }

  return (data as GuideRow[]).map(mapGuideRow);
}

export async function getGuideCategories() {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    return Array.from(new Set(guides.map((guide) => guide.category))).sort();
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guide_categories")
    .select("name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.warn("[guides] Failed to load guide categories", error);
    const guides = await getMdxGuidesMeta();
    return Array.from(new Set(guides.map((guide) => guide.category))).sort();
  }

  return (data ?? []).map((row) => row.name).filter(Boolean);
}

export async function getGuidesForBrowse({
  sort = "helpful",
  page = 1,
  limit = 9,
}: {
  sort?: GuideSortMode;
  page?: number;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    const sorted = [...guides].sort((a, b) => {
      if (sort === "views") return b.viewCount - a.viewCount;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    const start = (page - 1) * limit;
    const end = start + limit;
    return { guides: sorted.slice(start, end), count: sorted.length };
  }

  const supabase = await supabaseServer();
  const offset = (page - 1) * limit;
  const rangeEnd = offset + limit - 1;

  let query = supabase
    .from("guides")
    .select("*", { count: "exact" })
    .eq("status", "published");

  if (sort === "newest") {
    query = query.order("published_at", { ascending: false });
  } else if (sort === "views") {
    query = query.order("view_count", { ascending: false }).order("published_at", { ascending: false });
  } else {
    query = query
      .order("featured_guides_page", { ascending: false })
      .order("view_count", { ascending: false })
      .order("published_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, rangeEnd);

  if (error) {
    console.warn("[guides] Failed to load browse guides", error);
    const guides = await getMdxGuidesMeta();
    return { guides: guides.slice(0, limit), count: guides.length };
  }

  return {
    guides: (data as GuideRow[]).map(mapGuideRow),
    count: count ?? 0,
  };
}

export async function getRelatedGuides(slug: string, limit = 4) {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    const current = guides.find((guide) => guide.slug === slug);
    if (!current) return guides.slice(0, limit);
    const tagSet = new Set(current.tags);
    const scored = guides
      .filter((guide) => guide.slug !== slug)
      .map((guide) => {
        const sharedTags = guide.tags.filter((tag) => tagSet.has(tag)).length;
        const categoryMatch = guide.category === current.category ? 1 : 0;
        return { guide, score: sharedTags * 2 + categoryMatch };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.guide);
    return scored.length > 0 ? scored : guides.filter((guide) => guide.slug !== slug).slice(0, limit);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published");

  if (error) {
    console.warn("[guides] Failed to load related guides", error);
    const guides = await getMdxGuidesMeta();
    return guides.filter((guide) => guide.slug !== slug).slice(0, limit);
  }

  const guides = (data as GuideRow[]).map(mapGuideRow);
  const current = guides.find((guide) => guide.slug === slug);
  if (!current) return [];

  const tagSet = new Set(current.tags);
  const scored = guides
    .filter((guide) => guide.slug !== slug)
    .map((guide) => {
      const sharedTags = guide.tags.filter((tag) => tagSet.has(tag)).length;
      const categoryMatch = guide.category === current.category ? 1 : 0;
      return {
        guide,
        score: sharedTags * 2 + categoryMatch,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.guide.publishedAt).getTime() - new Date(a.guide.publishedAt).getTime();
    })
    .slice(0, limit)
    .map((item) => item.guide);

  if (scored.length > 0) return scored;

  return guides.filter((guide) => guide.slug !== slug).slice(0, limit);
}

export async function getContextualGuides({
  tags,
  category,
  limit = 3,
}: {
  tags?: string[];
  category?: string;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) {
    const guides = await getMdxGuidesMeta();
    const tagSet = new Set(tags ?? []);
    const scored = guides
      .map((guide) => {
        const sharedTags = guide.tags.filter((tag) => tagSet.has(tag)).length;
        const categoryMatch = category && guide.category === category ? 1 : 0;
        return { guide, score: sharedTags * 2 + categoryMatch };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.guide);
    return scored.length > 0 ? scored : guides.slice(0, limit);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("status", "published");

  if (error) {
    const guides = await getMdxGuidesMeta();
    return guides.slice(0, limit);
  }

  const guides = (data as GuideRow[]).map(mapGuideRow);
  const tagSet = new Set(tags ?? []);

  const scored = guides
    .map((guide) => {
      const sharedTags = guide.tags.filter((tag) => tagSet.has(tag)).length;
      const categoryMatch = category && guide.category === category ? 1 : 0;
      return {
        guide,
        score: sharedTags * 2 + categoryMatch,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.guide.publishedAt).getTime() - new Date(a.guide.publishedAt).getTime();
    })
    .slice(0, limit)
    .map((item) => item.guide);

  if (scored.length > 0) return scored;

  return guides.slice(0, limit);
}
