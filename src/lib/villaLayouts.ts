import { createClient } from "@/lib/supabase";

export type RoomKey =
  | "ST"
  | "ST_S5"
  | "ST_VALUE"
  | "1BR"
  | "2BR"
  | "THV"
  | "THV_1"
  | "THV_2"
  | "BUNG"
  | "GV"
  | "GV_1"
  | "GV_2";

export type LayoutVariant = {
  key: RoomKey;
  label: string;
  imageUrl: string;
  fileName: string;
  sort: number;
};

const BUCKET = "villa-layouts";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const JUNK_NAMES = new Set([".keep", "untitled folder"]);
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const ROOM_SORT_ORDER: Record<RoomKey, number> = {
  ST: 10,
  ST_S5: 20,
  ST_VALUE: 30,
  "1BR": 40,
  "2BR": 50,
  THV: 60,
  THV_1: 61,
  THV_2: 62,
  BUNG: 70,
  GV: 80,
  GV_1: 90,
  GV_2: 91,
};

const ROOM_LABELS: Record<RoomKey, string> = {
  ST: "Studio",
  ST_S5: "Studio (Sleeps 5)",
  ST_VALUE: "Value Studio",
  "1BR": "1 Bedroom Villa",
  "2BR": "2 Bedroom Villa",
  THV: "Treehouse Villa",
  THV_1: "Treehouse Villa (Option 1)",
  THV_2: "Treehouse Villa (Option 2)",
  BUNG: "Bungalow",
  GV: "Grand Villa",
  GV_1: "Grand Villa (Option 1)",
  GV_2: "Grand Villa (Option 2)",
};

function isImageFile(name: string) {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isJunkName(name: string) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return true;
  if (trimmed.startsWith(".")) return true;
  return JUNK_NAMES.has(trimmed);
}

function normalizeBaseName(name: string) {
  const lower = name.trim().toLowerCase();
  const base = lower.replace(/\.[^/.]+$/, "");
  return base.replace(/\s+/g, "-").replace(/_/g, "-");
}

function resolveRoomKey(fileName: string): RoomKey | null {
  const normalized = normalizeBaseName(fileName);

  if (/(gv)(?:-|\\s)?1st/.test(normalized)) return "GV_1";
  if (/(gv)(?:-|\\s)?2nd/.test(normalized)) return "GV_2";
  if (/\\bgv\\b/.test(normalized) || normalized.includes("-gv")) return "GV";

  if (/(thv)(?:-|\\s)?1st/.test(normalized)) return "THV_1";
  if (/(thv)(?:-|\\s)?2nd/.test(normalized)) return "THV_2";
  if (normalized.includes("thv")) return "THV";

  if (normalized.includes("bung") || normalized.includes("bungalow")) return "BUNG";

  if (/(^|-)st(-|$)/.test(normalized) || normalized.includes("studio")) {
    if (normalized.includes("s5")) return "ST_S5";
    if (normalized.includes("value")) return "ST_VALUE";
    return "ST";
  }

  if (
    normalized.includes("1br") ||
    normalized.includes("1-br") ||
    normalized.includes("1bed") ||
    normalized.includes("1-bedroom")
  ) {
    return "1BR";
  }

  if (
    normalized.includes("2br") ||
    normalized.includes("2-br") ||
    normalized.includes("2bed") ||
    normalized.includes("2-bedroom")
  ) {
    return "2BR";
  }

  return null;
}

function buildPublicUrl(path: string) {
  if (!SUPABASE_PUBLIC_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to build layout URLs.");
  }
  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function listLayoutsForResort(resortCode: string): Promise<LayoutVariant[]> {
  if (!resortCode) return [];

  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).list(resortCode, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.error("[villa-layouts] Failed to list layouts", error);
    return [];
  }

  return (data ?? [])
    .filter((file) => Boolean(file.name))
    .filter((file) => !isJunkName(file.name))
    .filter((file) => Boolean(file.id))
    .filter((file) => isImageFile(file.name))
    .map((file) => {
      const key = resolveRoomKey(file.name);
      if (!key) return null;
      const encodedName = encodeURIComponent(file.name);
      const path = `${resortCode}/${encodedName}`;
      return {
        key,
        label: ROOM_LABELS[key] ?? file.name,
        imageUrl: buildPublicUrl(path),
        fileName: file.name,
        sort: ROOM_SORT_ORDER[key] ?? 999,
      };
    })
    .filter((item): item is LayoutVariant => Boolean(item))
    .sort((a, b) => a.sort - b.sort);
}
