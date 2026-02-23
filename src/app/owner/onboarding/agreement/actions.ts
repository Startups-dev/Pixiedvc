"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type AcceptOwnerAgreementState = {
  error: string | null;
};

export async function acceptOwnerAgreement(
  _prevState: AcceptOwnerAgreementState,
  formData: FormData,
): Promise<AcceptOwnerAgreementState> {
  const supabase = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/onboarding/agreement");
  }

  const signature = String(formData.get("agreement_signature") ?? "").trim();
  if (signature.length < 3) {
    return { error: "Please enter your full legal name." };
  }

  const { data: ownerByUserId } = await client
    .from("owners")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  let owner = ownerByUserId
    ? ownerByUserId
    : (
        await client
          .from("owners")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()
      ).data;

  if (!owner) {
    await client
      .from("owners")
      .upsert({ id: user.id, user_id: user.id }, { onConflict: "id" });
    owner = (
      await client
        .from("owners")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()
    ).data;
  }

  if (!owner) {
    redirect("/owner/onboarding");
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipFromForwarded = forwardedFor?.split(",")[0]?.trim() ?? null;
  const ip = ipFromForwarded || requestHeaders.get("x-real-ip") || null;

  const { error } = await client
    .from("owners")
    .update({
      agreement_version: "v1",
      agreement_accepted_at: new Date().toISOString(),
      agreement_signed_name: signature,
      agreement_accepted_ip: ip,
    })
    .eq("id", owner.id);

  if (error) {
    return { error: "Unable to accept the agreement right now. Please try again." };
  }

  redirect("/owner");
}
