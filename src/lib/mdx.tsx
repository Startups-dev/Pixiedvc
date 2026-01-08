import fs from "node:fs/promises";
import path from "node:path";

import type { ReactNode } from "react";

import { compileMDX } from "next-mdx-remote/rsc";

import { Card, SectionHeader } from "@pixiedvc/design-system";

const MDX_ROOT = path.join(process.cwd(), "content");

export type MdxMeta = {
  title: string;
  summary?: string;
  updated?: string;
  index?: number;
};

export async function loadMdx(slug: string[]): Promise<{
  meta: MdxMeta;
  content: ReactNode;
}> {
  const filePath = path.join(MDX_ROOT, ...slug) + ".mdx";
  const source = await fs.readFile(filePath, "utf8");

  const { content, frontmatter } = await compileMDX<MdxMeta>({
    source,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return { meta: frontmatter, content };
}

export async function loadMdxSource(slug: string[]) {
  const filePath = path.join(MDX_ROOT, ...slug) + ".mdx";
  return fs.readFile(filePath, "utf8");
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join(" ");
  }
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export const mdxComponents = {
  h2: ({ children }: { children: ReactNode }) => {
    const id = slugify(extractText(children));
    return (
      <h2 id={id} className="scroll-mt-28 font-display text-3xl text-ink">
        {children}
      </h2>
    );
  },
  h3: ({ children }: { children: ReactNode }) => {
    const id = slugify(extractText(children));
    return (
      <h3 id={id} className="scroll-mt-28 font-display text-2xl text-ink">
        {children}
      </h3>
    );
  },
  p: ({ children }: { children: ReactNode }) => (
    <p className="text-base text-muted">{children}</p>
  ),
  ul: ({ children }: { children: ReactNode }) => (
    <ul className="list-disc space-y-2 pl-6 text-base text-muted">{children}</ul>
  ),
  ol: ({ children }: { children: ReactNode }) => (
    <ol className="list-decimal space-y-2 pl-6 text-base text-muted">{children}</ol>
  ),
  li: ({ children }: { children: ReactNode }) => (
    <li className="text-base text-muted">{children}</li>
  ),
  Card,
  SectionHeader,
};

export async function loadMdxDirectory(directory: string) {
  const dirPath = path.join(MDX_ROOT, directory);
  const entries = await fs.readdir(dirPath);

  const records = await Promise.all(
    entries
      .filter((name) => name.endsWith(".mdx"))
      .map(async (name) => {
        const slug = name.replace(/\.mdx$/, "");
        const { meta } = await loadMdx([directory, slug]);
        return { slug, meta };
      }),
  );

  return records.sort((a, b) => (a.meta.index ?? 0) - (b.meta.index ?? 0));
}
