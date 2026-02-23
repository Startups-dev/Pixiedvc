import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

type RequireOwnerAccessResult = {
  user: { id: string };
  owner: {
    id: string;
    user_id: string | null;
    agreement_accepted_at: string | null;
  };
};

export async function requireOwnerAccess(redirectPath: string): Promise<RequireOwnerAccessResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const { data: ownerByUserId } = await supabase
    .from("owners")
    .select("id, user_id, agreement_accepted_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const owner = ownerByUserId
    ? ownerByUserId
    : (
        await supabase
          .from("owners")
          .select("id, user_id, agreement_accepted_at")
          .eq("id", user.id)
          .maybeSingle()
      ).data;

  if (!owner) {
    redirect("/owner/onboarding");
  }

  if (!owner.agreement_accepted_at) {
    redirect("/owner/onboarding/agreement");
  }

  return { user, owner };
}
