import type { MetadataRoute } from "next";

import { getAllGuides } from "@/lib/guides";
import { getAllResortSlugs } from "@/lib/resorts";

export const dynamic = "force-dynamic";

const ORIGIN = "https://hannadvc.com";

// Public, canonical page routes. Dynamic resort and article paths come from their content sources.
const PUBLIC_PAGES = [
  "/",
  "/about-us",
  "/calculator",
  "/contact",
  "/dining-plan",
  "/faq",
  "/grocery-delivery",
  "/guides",
  "/guides/bay-lake-tower",
  "/guides/link-to-disney-experience",
  "/guides/ready-stays-transfer-linking",
  "/guests",
  "/guests/cancellation-policy",
  "/guests/how-renting-works",
  "/guests/policies",
  "/guests/rent-dvc-points",
  "/how-it-works",
  "/last-minute-deals",
  "/our-approach",
  "/our-story",
  "/owner-first-protection",
  "/owners",
  "/owners/founders-club",
  "/partners",
  "/partners/affiliate-program",
  "/partners/become-a-partner",
  "/plan",
  "/policies",
  "/policies/deferred-cancellation",
  "/privacy",
  "/ready-stays",
  "/resorts",
  "/services",
  "/services/catalog",
  "/services/grocery",
  "/support",
  "/terms",
];

function contentDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [resortSlugs, guides] = await Promise.all([getAllResortSlugs(), getAllGuides()]);
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const path of PUBLIC_PAGES) {
    const url = new URL(path, ORIGIN).href;
    entries.set(url, { url });
  }

  for (const slug of resortSlugs) {
    const url = new URL(`/resorts/${encodeURIComponent(slug)}`, ORIGIN).href;
    entries.set(url, { url });
  }

  for (const guide of guides) {
    if (!guide.slug || guide.status === "draft") continue;
    const url = new URL(`/guides/${encodeURIComponent(guide.slug)}`, ORIGIN).href;
    const lastModified = contentDate(guide.lastModified);
    entries.set(url, lastModified ? { url, lastModified } : { url });
  }

  return [...entries.values()];
}
