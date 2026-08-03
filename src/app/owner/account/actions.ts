"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  OWNER_AVATAR_BUCKET,
  buildOwnerAvatarStoragePath,
  getOwnerAvatarPathFromPublicUrl,
  isOwnerAvatarStoragePath,
  validateOwnerAvatarFile,
} from "@/lib/owner/avatar";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const ACCOUNT_PATH = "/owner/account";

function accountRedirect(status: string) {
  redirect(`${ACCOUNT_PATH}?status=${encodeURIComponent(status)}`);
}

async function getProfileAvatarUrl(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return typeof data?.avatar_url === "string" ? data.avatar_url : null;
}

async function deleteOwnedAvatarIfPresent(userId: string, avatarUrl: string | null) {
  const oldPath = getOwnerAvatarPathFromPublicUrl(avatarUrl);
  if (!isOwnerAvatarStoragePath(oldPath, userId)) return;

  const admin = getSupabaseAdminClient();
  if (!admin) return;
  await admin.storage.from(OWNER_AVATAR_BUCKET).remove([oldPath]);
}

export async function updateOwnerAccountDisplayName(formData: FormData) {
  const { user } = await requireOwnerAccess(ACCOUNT_PATH);
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName || displayName.length > 80) {
    accountRedirect("invalid-name");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    accountRedirect("save-failed");
  }

  revalidatePath("/owner");
  revalidatePath(ACCOUNT_PATH);
  accountRedirect("profile-saved");
}

export async function uploadOwnerAvatar(formData: FormData) {
  const { user } = await requireOwnerAccess(ACCOUNT_PATH);
  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    accountRedirect("invalid-avatar");
  }

  const validationError = validateOwnerAvatarFile(file);
  if (validationError) {
    accountRedirect("invalid-avatar");
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    accountRedirect("upload-unavailable");
  }

  const previousAvatarUrl = await getProfileAvatarUrl(user.id);
  const objectPath = buildOwnerAvatarStoragePath(user.id, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(OWNER_AVATAR_BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    accountRedirect("upload-failed");
  }

  const { data } = admin.storage.from(OWNER_AVATAR_BUCKET).getPublicUrl(objectPath);
  const supabase = await createSupabaseServerClient();
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      avatar_url: data.publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await admin.storage.from(OWNER_AVATAR_BUCKET).remove([objectPath]);
    accountRedirect("upload-failed");
  }

  await deleteOwnedAvatarIfPresent(user.id, previousAvatarUrl);
  revalidatePath("/owner");
  revalidatePath(ACCOUNT_PATH);
  accountRedirect("avatar-saved");
}

export async function removeOwnerAvatar() {
  const { user } = await requireOwnerAccess(ACCOUNT_PATH);
  const previousAvatarUrl = await getProfileAvatarUrl(user.id);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    accountRedirect("remove-failed");
  }

  await deleteOwnedAvatarIfPresent(user.id, previousAvatarUrl);
  revalidatePath("/owner");
  revalidatePath(ACCOUNT_PATH);
  accountRedirect("avatar-removed");
}
