import { resolveResortImage } from "@/lib/resort-image";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function estimateSleepsFromRoomType(roomType: string | null | undefined) {
  const normalized = (roomType ?? "").toLowerCase();
  if (normalized.includes("grand villa") || normalized.includes("3 bedroom")) return 12;
  if (normalized.includes("2 bedroom") || normalized.includes("bungalow")) return 8;
  if (normalized.includes("1 bedroom")) return 5;
  if (normalized.includes("tower studio")) return 2;
  if (normalized.includes("duo studio")) return 2;
  if (normalized.includes("studio")) return 4;
  if (normalized.includes("cabin")) return 6;
  if (normalized.includes("cottage")) return 12;
  if (normalized.includes("treehouse")) return 9;
  return 4;
}

export function buildReadyStayShowcaseDefaults(input: {
  id: string;
  checkIn: string;
  resortName: string | null;
  resortSlug: string | null;
  resortCode: string | null;
  roomType: string | null;
}) {
  const resortName = input.resortName?.trim() || "Disney Villa Stay";
  const roomType = input.roomType?.trim() || "Villa";
  const monthDay = (() => {
    const date = new Date(input.checkIn);
    if (Number.isNaN(date.getTime())) return "stay";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  const imageUrl = resolveResortImage({
    resortCode: input.resortCode,
    resortSlug: input.resortSlug,
    imageIndex: 1,
  }).url;

  const slugSource = `${input.resortSlug ?? slugify(resortName)}-${roomType}-${input.checkIn}-${input.id.slice(0, 8)}`;

  return {
    slug: slugify(slugSource),
    title: `${resortName} · ${roomType}`,
    short_description: `${roomType} stay beginning ${monthDay}.`,
    image_url: imageUrl,
    sleeps: estimateSleepsFromRoomType(roomType),
    badge: "Ready to Book",
    cta_label: "View Stay",
    href: `/ready-stays/${input.id}`,
    placement_home: false,
    placement_resort: true,
    placement_search: true,
  };
}
