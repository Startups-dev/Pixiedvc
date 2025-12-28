import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServer } from "@/lib/supabase";
import { isAdminEmailStrict } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

import AdminTestimonialsClient from "./AdminTestimonialsClient";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/admin/testimonials")}`);
  }

  if (!isAdminEmailStrict(user.email)) {
    redirect("/");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-slate-600">Service role key is required to view submissions.</p>
      </main>
    );
  }

  const { data, error } = await supabaseAdmin
    .from("testimonial_submissions")
    .select("id, created_at, quote, author, location, email, status, admin_notes")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-slate-600">Unable to load submissions.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="text-2xl font-semibold text-slate-900">Pending testimonials</h1>
        <p className="text-sm text-slate-600">
          Review submissions before approving them for public display.
        </p>
      </header>

      <AdminTestimonialsClient initial={data ?? []} />
    </main>
  );
}
