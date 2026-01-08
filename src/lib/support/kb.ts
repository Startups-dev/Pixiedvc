import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

export type SupportFaq = {
  question: string;
  answer: string;
};

export type SupportDocMeta = {
  title: string;
  slug: string;
  category: string;
  updatedAt: string;
  audience?: string;
  faqs?: SupportFaq[];
};

export type SupportDoc = {
  meta: SupportDocMeta;
  content: string;
};

const SUPPORT_DIR = path.join(process.cwd(), "content", "support");

export async function loadSupportDocs(): Promise<SupportDoc[]> {
  const entries = await fs.readdir(SUPPORT_DIR);
  const docs = await Promise.all(
    entries
      .filter((name) => name.endsWith(".mdx"))
      .map(async (name) => {
        const filePath = path.join(SUPPORT_DIR, name);
        const source = await fs.readFile(filePath, "utf8");
        const parsed = matter(source);
        const meta = parsed.data as SupportDocMeta;
        return {
          meta,
          content: parsed.content.trim(),
        };
      }),
  );

  return docs.sort((a, b) => a.meta.title.localeCompare(b.meta.title));
}
