import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import {
  SETTINGS_KEYS,
  getPromotionsSetting,
  getPromotionsSettings,
  updatePromotionsSetting,
  updatePromotionsSettings,
  type PromotionsSettingKey,
} from "@/lib/promotions-settings";

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") as PromotionsSettingKey | null;
  const isValidKey = key ? SETTINGS_KEYS.includes(key) : false;

  if (key && !isValidKey) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const { data, error } = key ? await getPromotionsSetting(key) : await getPromotionsSettings();
  if (error) {
    console.error("Failed to load promotions settings", {
      code: (error as { code?: string }).code,
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 });
  }

  if (key) {
    return NextResponse.json({ key, enabled: data });
  }

  return NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const key = body?.key as PromotionsSettingKey | undefined;
  const enabled = body?.enabled;
  const guestFlag = body?.guest_enrollment_enabled;
  const ownerFlag = body?.owner_enrollment_enabled;

  const isKeyUpdate = Boolean(key) && SETTINGS_KEYS.includes(key as PromotionsSettingKey);
  if (isKeyUpdate && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!isKeyUpdate && (typeof guestFlag !== "boolean" || typeof ownerFlag !== "boolean")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = isKeyUpdate
    ? await updatePromotionsSetting({
        key: key as PromotionsSettingKey,
        enabled,
        updated_by: user.id,
      })
    : await updatePromotionsSettings({
        guest_enrollment_enabled: guestFlag,
        owner_enrollment_enabled: ownerFlag,
        updated_by: user.id,
      });

  if (error) {
    console.error("Failed to update promotions settings", {
      code: (error as { code?: string }).code,
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return NextResponse.json({ error: "Unable to update settings" }, { status: 500 });
  }

  if (isKeyUpdate) {
    return NextResponse.json({ key, enabled: data });
  }

  return NextResponse.json({ settings: data });
}
