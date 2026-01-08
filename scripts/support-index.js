const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const matter = require("gray-matter");
const { createClient } = require("@supabase/supabase-js");

async function loadSupportDocs() {
  const supportDir = path.join(process.cwd(), "content", "support");
  const entries = await fs.readdir(supportDir);
  const docs = await Promise.all(
    entries
      .filter((name) => name.endsWith(".mdx"))
      .map(async (name) => {
        const filePath = path.join(supportDir, name);
        const source = await fs.readFile(filePath, "utf8");
        const parsed = matter(source);
        return {
          meta: parsed.data,
          content: parsed.content.trim(),
        };
      }),
  );
  return docs;
}

function hashDocument(payload) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(payload));
  return hash.digest("hex");
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role key is not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function run() {
  const supabase = createServiceClient();
  const docs = await loadSupportDocs();
  const slugs = docs.map((doc) => doc.meta.slug);

  const { data: existing, error: existingError } = await supabase
    .from("support_kb_documents")
    .select("slug, content_hash")
    .in("slug", slugs);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingMap = new Map(
    (existing ?? []).map((row) => [row.slug, row.content_hash]),
  );

  let updated = 0;
  for (const doc of docs) {
    const hash = hashDocument({
      title: doc.meta.title,
      category: doc.meta.category,
      content: doc.content,
      updatedAt: doc.meta.updatedAt,
      audience: doc.meta.audience ?? null,
    });

    if (existingMap.get(doc.meta.slug) === hash) {
      continue;
    }

    const { error } = await supabase.from("support_kb_documents").upsert(
      {
        slug: doc.meta.slug,
        title: doc.meta.title,
        category: doc.meta.category,
        content: stripMarkdown(doc.content),
        content_hash: hash,
        audience: doc.meta.audience ?? null,
        updated_at: doc.meta.updatedAt,
      },
      { onConflict: "slug" },
    );

    if (error) {
      throw new Error(error.message);
    }

    updated += 1;
    console.log(`Indexed: ${doc.meta.slug}`);
  }

  const { count } = await supabase
    .from("support_kb_documents")
    .select("id", { count: "exact" });

  console.log(`Support KB indexing complete. Updated: ${updated}`);
  console.log(`Support KB total rows: ${count ?? 0}`);
}

run().catch((error) => {
  console.error("Support KB indexing failed.");
  console.error(error);
  process.exit(1);
});
