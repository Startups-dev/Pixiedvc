import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const SETTINGS_KEYS = [
  "promotions_guest_enrollment_enabled",
  "promotions_owner_enrollment_enabled",
] as const;

export type PromotionsSettingKey = (typeof SETTINGS_KEYS)[number];

export type PromotionsSettings = {
  guest_enrollment_enabled: boolean;
  owner_enrollment_enabled: boolean;
};

function parseSettingValue(row: { key: string; value: unknown }) {
  const value = row.value as { enabled?: boolean } | null;
  return value?.enabled ?? true;
}

export async function getPromotionsSettings() {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { data: null, error: new Error("Service role key not configured") };
  }

  const { data, error } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", [...SETTINGS_KEYS]);

  if (error) {
    return { data: null, error };
  }

  const values = new Map<string, boolean>();
  (data ?? []).forEach((row: { key: string; value: unknown }) => {
    values.set(row.key, parseSettingValue(row));
  });

  return {
    data: {
      guest_enrollment_enabled: values.get("promotions_guest_enrollment_enabled") ?? true,
      owner_enrollment_enabled: values.get("promotions_owner_enrollment_enabled") ?? true,
    } satisfies PromotionsSettings,
    error: null,
  };
}

export async function getPromotionsSetting(key: PromotionsSettingKey) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { data: null, error: new Error("Service role key not configured") };
  }

  const { data, error } = await adminClient
    .from("app_settings")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: true, error: null };
  }

  return { data: parseSettingValue(data), error: null };
}

export async function updatePromotionsSettings(params: {
  guest_enrollment_enabled: boolean;
  owner_enrollment_enabled: boolean;
  updated_by?: string | null;
}) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { data: null, error: new Error("Service role key not configured") };
  }

  const nowIso = new Date().toISOString();
  const payload = [
    {
      key: "promotions_guest_enrollment_enabled",
      value: { enabled: params.guest_enrollment_enabled },
      updated_at: nowIso,
      updated_by: params.updated_by ?? null,
    },
    {
      key: "promotions_owner_enrollment_enabled",
      value: { enabled: params.owner_enrollment_enabled },
      updated_at: nowIso,
      updated_by: params.updated_by ?? null,
    },
  ];

  const { error } = await adminClient
    .from("app_settings")
    .upsert(payload, { onConflict: "key" });

  if (error) {
    return { data: null, error };
  }

  return getPromotionsSettings();
}

export async function updatePromotionsSetting(params: {
  key: PromotionsSettingKey;
  enabled: boolean;
  updated_by?: string | null;
}) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { data: null, error: new Error("Service role key not configured") };
  }

  const { error } = await adminClient
    .from("app_settings")
    .upsert(
      {
        key: params.key,
        value: { enabled: params.enabled },
        updated_at: new Date().toISOString(),
        updated_by: params.updated_by ?? null,
      },
      { onConflict: "key" }
    );

  if (error) {
    return { data: null, error };
  }

  return getPromotionsSetting(params.key);
}
