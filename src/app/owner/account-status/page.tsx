import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeOwnerLifecycleStatus } from "@/lib/owner/lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function OwnerAccountStatusPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/owner/account-status")}`);
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("lifecycle_status, lifecycle_status_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  const lifecycleStatus = normalizeOwnerLifecycleStatus(owner?.lifecycle_status);

  if (lifecycleStatus === "active") {
    redirect("/owner/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Owner account</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {lifecycleStatus === "suspended" ? "Owner access is suspended" : "Owner account is closed"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          This owner account is not active for marketplace actions. Existing reservations, agreements, payout records,
          and account history remain preserved for HannaDVC operations.
        </p>
        {owner?.lifecycle_status_reason ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {owner.lifecycle_status_reason}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Return home
          </Link>
          <Link
            href="/contact"
            className="inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Contact HannaDVC
          </Link>
        </div>
      </section>
    </main>
  );
}
