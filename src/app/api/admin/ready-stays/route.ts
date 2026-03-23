import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set(["draft", "active", "sold", "expired", "paused", "removed"]);

type ReadyStayMutationPayload = {
  id?: string;
  slug?: string | null;
  title?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  badge?: string | null;
  cta_label?: string | null;
  href?: string | null;
  featured?: boolean;
  priority?: number;
  sort_override?: number | null;
  placement_home?: boolean;
  placement_resort?: boolean;
  placement_search?: boolean;
  expires_at?: string | null;
  status?: string;
  sleeps?: number;
  owner_id?: string;
  rental_id?: string;
  resort_id?: string;
  check_in?: string;
  check_out?: string;
  points?: number;
  room_type?: string;
  season_type?: string;
  owner_price_per_point_cents?: number;
  guest_price_per_point_cents?: number;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function isValidDate(value: unknown) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function validateActiveFields(payload: ReadyStayMutationPayload) {
  if (payload.status !== "active") return null;
  if (!normalizeText(payload.slug)) return "Slug is required for active Ready Stays.";
  if (!normalizeText(payload.title)) return "Title is required for active Ready Stays.";
  if (!normalizeText(payload.image_url)) return "Image URL is required for active Ready Stays.";
  if (!Number.isFinite(Number(payload.sleeps)) || Number(payload.sleeps) < 1)
    return "Sleeps must be at least 1 for active Ready Stays.";
  return null;
}

function validateDates(payload: ReadyStayMutationPayload) {
  if (payload.check_in && !isValidDate(payload.check_in)) return "Invalid check-in date.";
  if (payload.check_out && !isValidDate(payload.check_out)) return "Invalid check-out date.";
  if (payload.expires_at && !isValidDate(payload.expires_at)) return "Invalid expires_at timestamp.";

  if (payload.check_in && payload.check_out) {
    const checkIn = new Date(payload.check_in);
    const checkOut = new Date(payload.check_out);
    if (checkOut <= checkIn) return "Check-out must be after check-in.";
  }

  return null;
}

function normalizePayload(payload: ReadyStayMutationPayload, createMode = false) {
  const normalized: Record<string, unknown> = {
    slug: normalizeText(payload.slug),
    title: normalizeText(payload.title),
    short_description: normalizeText(payload.short_description),
    image_url: normalizeText(payload.image_url),
    badge: normalizeText(payload.badge),
    cta_label: normalizeText(payload.cta_label),
    href: normalizeText(payload.href),
    expires_at: normalizeText(payload.expires_at),
    featured: payload.featured,
    placement_home: payload.placement_home,
    placement_resort: payload.placement_resort,
    placement_search: payload.placement_search,
    sort_override: payload.sort_override,
    priority: payload.priority,
    status: payload.status,
    sleeps: payload.sleeps,
  };

  if (createMode) {
    Object.assign(normalized, {
      owner_id: payload.owner_id,
      rental_id: payload.rental_id,
      resort_id: payload.resort_id,
      check_in: payload.check_in,
      check_out: payload.check_out,
      points: payload.points,
      room_type: normalizeText(payload.room_type),
      season_type: normalizeText(payload.season_type),
      owner_price_per_point_cents: payload.owner_price_per_point_cents,
      guest_price_per_point_cents: payload.guest_price_per_point_cents,
    });
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
}

async function assertAdmin() {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  let profileRole: string | null = null;
  if (user?.id) {
    const { data: profile } = await sessionClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    profileRole = profile?.role ?? null;
  }

  const appRole = (user?.app_metadata?.role as string | undefined) ?? null;
  const allowed =
    !!user &&
    isUserAdmin({
      profileRole,
      appRole,
      email: user.email ?? null,
    });

  if (!allowed) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Ready Stays admin is disabled by feature flag." }, { status: 403 }),
    };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ok: false as const, response: NextResponse.json({ error: "Service role not configured." }, { status: 500 }) };
  }

  return { ok: true as const, adminClient };
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.adminClient
    .from("ready_stays")
    .select(
      "id, slug, title, short_description, status, featured, priority, sort_override, placement_home, placement_resort, placement_search, check_in, check_out, points, sleeps, image_url, badge, cta_label, href, expires_at, owner_id, rental_id, resort_id, room_type, season_type, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, resorts(name, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const payload = (await request.json().catch(() => ({}))) as ReadyStayMutationPayload;
  if (!payload.owner_id || !payload.rental_id || !payload.resort_id) {
    return NextResponse.json({ error: "owner_id, rental_id, and resort_id are required." }, { status: 400 });
  }
  if (!payload.check_in || !payload.check_out || !payload.room_type || !payload.season_type) {
    return NextResponse.json({ error: "check_in, check_out, room_type, and season_type are required." }, { status: 400 });
  }

  if (!Number.isFinite(Number(payload.points)) || Number(payload.points) < 1) {
    return NextResponse.json({ error: "points must be a positive number." }, { status: 400 });
  }

  if (!Number.isFinite(Number(payload.owner_price_per_point_cents)) || !Number.isFinite(Number(payload.guest_price_per_point_cents))) {
    return NextResponse.json({ error: "Owner and guest point prices are required." }, { status: 400 });
  }

  const status = payload.status ?? "draft";
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  payload.status = status;

  const dateError = validateDates(payload);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const activeError = validateActiveFields(payload);
  if (activeError) return NextResponse.json({ error: activeError }, { status: 400 });

  const insertPayload = normalizePayload(payload, true);

  const { data, error } = await guard.adminClient
    .from("ready_stays")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const payload = (await request.json().catch(() => ({}))) as ReadyStayMutationPayload;
  if (!payload.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  if (payload.status && !ALLOWED_STATUSES.has(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const dateError = validateDates(payload);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const activeError = validateActiveFields(payload);
  if (activeError) return NextResponse.json({ error: activeError }, { status: 400 });

  const updatePayload = normalizePayload(payload, false);

  const { error } = await guard.adminClient.from("ready_stays").update(updatePayload).eq("id", payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const payload = (await request.json().catch(() => ({}))) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { error } = await guard.adminClient
    .from("ready_stays")
    .update({ status: "removed", placement_home: false, placement_resort: false, placement_search: false })
    .eq("id", payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
