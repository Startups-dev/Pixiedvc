import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DisplayNameForm from "@/components/profile/display-name-form";
import ContactForm from "@/components/profile/contact-form";
import { createServer } from "@/lib/supabase";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/profile");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, phone, onboarding_completed, role')
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? "";
  const roleLabel = profile?.role ? (profile.role === 'owner' ? 'Owner' : 'Guest') : 'Not selected';
  const onboardingComplete = profile?.onboarding_completed ?? false;
  const onboardingCopy = onboardingComplete
    ? 'You have completed the onboarding wizard. Update your info anytime.'
    : 'Finish onboarding to unlock the owner or guest experience.';
  const statusAction = onboardingComplete
    ? profile?.role === 'owner'
      ? { href: '/owner', label: 'Go to owner dashboard' }
      : { href: '/guest', label: 'View guest home' }
    : { href: '/onboarding', label: 'Finish onboarding' };

  return (
    <div className="mx-auto mt-16 max-w-3xl space-y-10 px-6 pb-24">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Account</p>
        <h1 className="text-3xl font-semibold text-slate-900">Your PixieDVC profile</h1>
        <p className="max-w-2xl text-base text-slate-600">
          Manage how your name appears across PixieDVC and keep your contact details up to date. We keep the email address tied to your
          login (<span className="font-medium">{user.email}</span>) in sync with Supabase authentication.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Account role</p>
            <p className="text-xl font-semibold text-slate-900">{roleLabel}</p>
            <p className="mt-1 text-sm text-slate-600">{onboardingCopy}</p>
          </div>
          <Link
            href={statusAction.href}
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
          >
            {statusAction.label}
          </Link>
        </div>
        {onboardingComplete ? (
          <p className="mt-3 text-xs text-slate-500">
            Need to update your info?{' '}
            <Link href="/onboarding" className="font-semibold text-emerald-600">
              Revisit onboarding
            </Link>
            .
          </p>
        ) : null}
        <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Role</dt>
            <dd className="text-base font-medium text-slate-900">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Onboarding status</dt>
            <dd className="text-base font-medium text-slate-900">{onboardingComplete ? 'Complete' : 'Needs action'}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Display name</h2>
        <p className="text-sm text-slate-600">
          This name appears in the site header and communications we send to owners or guests.
        </p>
        <DisplayNameForm userId={user.id} initialValue={displayName} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Contact details</h2>
        <ContactForm userId={user.id} initialPhone={profile?.phone ?? null} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Account security</h2>
        <p className="mt-2 text-sm text-slate-600">
          Need to change your password or email? Head to the <Link href="/login" className="text-indigo-600 underline">login page</Link> to send yourself a new reset link. All
          security-sensitive changes happen through our protected Supabase flows.
        </p>
        <dl className="mt-4 grid gap-4 text-sm text-slate-500">
          <div>
            <dt className="font-medium text-slate-700">Member since</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          {profile?.phone ? (
            <div>
              <dt className="font-medium text-slate-700">Phone</dt>
              <dd>{profile.phone}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
