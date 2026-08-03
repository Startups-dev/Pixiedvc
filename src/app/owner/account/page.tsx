import { Camera, Trash2 } from "lucide-react";

import { Button, Card } from "@pixiedvc/design-system";
import OwnerAvatar from "@/components/owner/shell/OwnerAvatar";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { buildOwnerShellIdentity } from "@/lib/owner/identity";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { createSupabaseServerClient } from "@/lib/supabase-server";

import { removeOwnerAvatar, updateOwnerAccountDisplayName, uploadOwnerAvatar } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, string> = {
  "profile-saved": "Profile updated.",
  "avatar-saved": "Profile photo updated.",
  "avatar-removed": "Profile photo removed.",
  "invalid-name": "Enter a display name between 1 and 80 characters.",
  "invalid-avatar": "Use a JPG, PNG, WebP, or GIF image up to 2 MB.",
  "upload-unavailable": "Avatar upload is unavailable right now.",
  "upload-failed": "We could not update that profile photo. Please try again.",
  "remove-failed": "We could not remove that profile photo. Please try again.",
  "save-failed": "We could not save those changes. Please try again.",
};

export default async function OwnerAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string };
}) {
  const { user } = await requireOwnerAccess("/owner/account");
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const identity = buildOwnerShellIdentity({
    userEmail: user.email,
    userMetadata: user.user_metadata as Record<string, unknown> | null,
    profile,
  });
  const resolvedSearchParams = await searchParams;
  const statusMessage = resolvedSearchParams?.status ? STATUS_COPY[resolvedSearchParams.status] : null;

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner account"
        title="Account settings"
        description="Manage your owner profile name and profile photo. Your login email remains tied to your secure HannaDVC account."
      />

      {statusMessage ? (
        <div className="rounded-[14px] border border-[#E7E7E4] bg-white px-4 py-3 text-sm font-medium text-[#10224A]">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <div className="flex flex-col items-start gap-5">
            <OwnerAvatar
              displayName={identity.displayName}
              avatarUrl={identity.avatarUrl}
              initials={identity.initials}
              size="lg"
            />
            <div>
              <h2 className="text-lg font-semibold text-[#10224A]">{identity.displayName ?? "Owner profile"}</h2>
              <p className="mt-1 text-sm text-[#667085]">{identity.email ?? "Email unavailable"}</p>
            </div>
            <form action={uploadOwnerAvatar} className="w-full space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-[#10224A]">Profile photo</span>
                <input
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-2 block w-full rounded-[12px] border border-[#E7E7E4] bg-white px-3 py-2 text-sm text-[#10224A] file:mr-4 file:rounded-full file:border-0 file:bg-[#10224A] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </label>
              <p className="text-xs leading-5 text-[#667085]">JPG, PNG, WebP, or GIF. Maximum 2 MB.</p>
              <Button type="submit" className="gap-2">
                <Camera aria-hidden="true" className="h-4 w-4" />
                Upload photo
              </Button>
            </form>
            {identity.avatarUrl ? (
              <form action={removeOwnerAvatar}>
                <Button type="submit" variant="ghost" className="gap-2">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Remove photo
                </Button>
              </form>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <form action={updateOwnerAccountDisplayName} className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[#10224A]">Profile details</h2>
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                This name appears in your owner workspace. Your email is read-only here.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-[#10224A]">Display name</span>
              <input
                name="display_name"
                defaultValue={identity.displayName ?? ""}
                maxLength={80}
                className="mt-2 h-11 w-full rounded-[12px] border border-[#E7E7E4] bg-white px-3 text-sm text-[#10224A] outline-none transition focus:border-[#D8B451] focus:ring-2 focus:ring-[#D8B451]/20"
                placeholder="Your name"
              />
            </label>
            <div>
              <p className="text-sm font-semibold text-[#10224A]">Email</p>
              <p className="mt-2 rounded-[12px] border border-[#E7E7E4] bg-[#FAFAF8] px-3 py-3 text-sm text-[#667085]">
                {identity.email ?? "Email unavailable"}
              </p>
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
