import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TEST_GUEST_AUTH_USER_ID = "4de38521-9534-4b81-b54e-81e6b7c58539";
const SETTING_KEY = "single_guest_test_booking_enabled";

/** The only Supabase Auth user permitted to use the server-side test path. */
export function designatedTestGuestId() {
  return TEST_GUEST_AUTH_USER_ID;
}

export function isDesignatedTestGuest(userId: string | null | undefined) {
  return userId?.toLowerCase() === TEST_GUEST_AUTH_USER_ID;
}

/** Read on every request so the bypass can be disabled without redeploying. */
export async function isTestBookingEnabled() {
  const admin = getSupabaseAdminClient();
  if (!admin) return false;
  const { data, error } = await admin.from("app_settings")
    .select("value").eq("key", SETTING_KEY).maybeSingle();
  if (error || !data || !data.value || typeof data.value !== "object") return false;
  const setting = data.value as { enabled?: unknown; auth_user_id?: unknown };
  return setting.enabled === true && setting.auth_user_id === TEST_GUEST_AUTH_USER_ID;
}
