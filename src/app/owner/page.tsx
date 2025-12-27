import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServer } from "@/lib/supabase";
import OwnerDocumentUploader from "@/components/owner/document-uploader";

export const dynamic = "force-dynamic";

type OwnerMembership = {
  id: string;
  use_year: string | null;
  contract_year: number | null;
  points_owned: number | null;
  points_available: number | null;
  resort: {
    name: string;
    slug: string;
  } | null;
};

type OwnerDocument = {
  id: string;
  kind: string;
  storage_path: string;
  created_at: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function OwnerDashboard() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner");
  }

  const [{ data: ownerRow }, { data: membershipRows }, { data: documentRows }] = await Promise.all([
    supabase
      .from("owners")
      .select('verification, rejection_reason, verified_at, profiles:profiles!owners_user_id_fkey(display_name)')
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from('owner_memberships')
      .select('id, use_year, contract_year, points_owned, points_available, resort:resorts(name, slug)')
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("owner_documents")
      .select("id, kind, storage_path, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const ownerRecord = ownerRow ?? null;
  const ownerState = ownerRecord ? ownerRecord.verification ?? "pending" : "not_started";
  const memberships = (membershipRows ?? []) as OwnerMembership[];
  const documents = (documentRows ?? []) as OwnerDocument[];
  const totalAvailable = memberships.reduce((sum, membership) => sum + (membership.points_available ?? 0), 0);
  const membershipCardDoc = documents.find((doc) => doc.kind === "member_card") ?? null;
  const govIdDoc = documents.find((doc) => doc.kind === "id") ?? null;
  const hasDocuments = Boolean(membershipCardDoc || govIdDoc);
  const aggregatedPointsOwned = memberships.reduce((sum, membership) => sum + (membership.points_owned ?? 0), 0);
  const primaryMembership = memberships[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <header className="space-y-4 rounded-3xl bg-[#0f2148] px-8 py-10 text-white shadow-[0_40px_80px_rgba(15,33,72,0.35)]">
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">Owner Concierge</p>
        <h1 className="text-3xl font-semibold">Welcome back, {ownerRow?.profiles?.display_name ?? user.email}</h1>
        <p className="max-w-3xl text-white/80">
          Track verification, view available points, and keep your documents in sync so PixieDVC can match the right guests to your
          contract.
        </p>
      </header>

      <StatusBanner state={ownerState} totalAvailable={totalAvailable} rejectionReason={ownerRow?.rejection_reason ?? null} />

      <section className="grid gap-6 lg:grid-cols-3">
        <VerificationProgressCard
          ownerState={ownerState}
          hasOwnerRecord={Boolean(ownerRecord)}
          hasMembership={memberships.length > 0}
          hasDocuments={hasDocuments}
          hasBothDocs={Boolean(membershipCardDoc && govIdDoc)}
        />
        <DocumentsOnFileCard membershipCard={membershipCardDoc} govIdCard={govIdDoc} />
        <InventorySummaryCard
          isVerified={ownerState === "verified"}
          totalOwned={aggregatedPointsOwned}
          totalAvailable={totalAvailable}
          homeResort={primaryMembership?.resort?.name ?? null}
          useYear={primaryMembership?.use_year ?? null}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Memberships</h2>
            <p className="text-sm text-slate-500">Every contract feeds your matching availability.</p>
          </div>
          <Link href="/owner/onboarding" className="text-sm font-semibold text-indigo-600 hover:underline">
            Add another contract
          </Link>
        </div>
        {memberships.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            No memberships on file yet. Submit your contract details so we can start matching guests.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-slate-100">
            {memberships.map((membership) => (
              <div key={membership.id} className="grid gap-4 py-4 text-sm text-slate-700 sm:grid-cols-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resort</p>
                  <p className="text-base font-semibold text-slate-900">{membership.resort?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Use year</p>
                  <p className="text-base font-medium">{membership.use_year ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contract year</p>
                  <p className="text-base font-medium">{membership.contract_year ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Points owned</p>
                  <p className="text-base font-medium">{membership.points_owned ? currency.format(membership.points_owned) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Points available</p>
                  <p className="text-base font-medium">{membership.points_available ? currency.format(membership.points_available) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {memberships.length ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Total points available for rent: <span className="font-semibold text-slate-900">{currency.format(totalAvailable)}</span>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            <p className="text-sm text-slate-500">Proof of ownership keeps matches flowing. Upload redacted versions only.</p>
            {documents.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{formatKind(doc.kind)}</p>
                      <p className="text-xs text-slate-500">Uploaded {dateFormatter.format(new Date(doc.created_at))}</p>
                    </div>
                    <Link
                      href={buildStorageUrl(doc.storage_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-full md:w-96">
            <OwnerDocumentUploader />
          </div>
        </div>
      </section>
    </div>
  );
}

function formatKind(kind: string) {
  switch (kind) {
    case "member_card":
      return "DVC Member Card";
    case "id":
      return "Government ID";
    default:
      return kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function buildStorageUrl(path: string) {
  if (!path) {
    return '#';
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return '#';
  }
  return `${base}/storage/v1/object/public/owner-docs/${path}`;
}

function StatusBanner({ state, totalAvailable, rejectionReason }: { state: string; totalAvailable: number; rejectionReason: string | null }) {
  if (state === 'not_started') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">You haven’t completed owner onboarding yet</h2>
        <p className="mt-1 text-sm text-slate-600">To rent out your DVC points, please submit your ownership details and documents.</p>
        <Link
          href="/owner/onboarding"
          className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Start Owner Onboarding
        </Link>
      </div>
    );
  }

  if (state === 'pending') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <h2 className="text-base font-semibold">Your ownership is under review</h2>
        <p className="mt-1 text-sm">
          Thanks for submitting your documents. Our team is verifying your membership. We’ll email you as soon as your owner account is
          activated.
        </p>
        <p className="mt-1 text-xs text-amber-800/80">Typical review time: 24–48 hours.</p>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
        <h2 className="text-base font-semibold">Your owner account is verified!</h2>
        <p className="mt-1 text-sm">
          Your points are now eligible to be matched with guest booking requests. You’ll receive emails when there are good matches.
        </p>
        <p className="mt-1 text-xs text-emerald-800/80">Available points: {totalAvailable.toLocaleString()} pts</p>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900">
        <h2 className="text-base font-semibold">We couldn’t verify your ownership</h2>
        <p className="mt-1 text-sm">
          {rejectionReason || 'We were unable to verify the documents provided. Please contact support or update your uploads.'}
        </p>
        <p className="mt-1 text-xs text-rose-800/80">Need help? Email concierge@pixiedvc.com.</p>
      </div>
    );
  }

  return null;
}

type ProgressProps = {
  ownerState: string;
  hasOwnerRecord: boolean;
  hasMembership: boolean;
  hasDocuments: boolean;
  hasBothDocs: boolean;
};

function VerificationProgressCard({ ownerState, hasOwnerRecord, hasMembership, hasDocuments, hasBothDocs }: ProgressProps) {
  const steps = [
    {
      label: 'Owner profile created',
      description: 'Your PixieDVC account is set up.',
      state: hasOwnerRecord ? 'complete' : 'pending',
    },
    {
      label: 'Ownership details submitted',
      description: 'Tell us your resort and use year to unlock matching.',
      state: hasMembership ? 'complete' : hasOwnerRecord ? 'current' : 'pending',
    },
    {
      label: 'Documents uploaded',
      description: hasDocuments ? 'Thanks! We will review them shortly.' : 'We need a member card + a redacted government ID.',
      state: hasBothDocs ? 'complete' : hasDocuments ? 'current' : 'pending',
    },
    {
      label:
        ownerState === 'verified'
          ? 'Account verified'
          : ownerState === 'rejected'
          ? 'Verification failed'
          : 'Account verification in progress',
      description:
        ownerState === 'verified'
          ? 'You can now receive matches.'
          : ownerState === 'rejected'
          ? 'Update your uploads or contact concierge.'
          : 'We’ll notify you once verification completes.',
      state:
        ownerState === 'verified'
          ? 'complete'
          : ownerState === 'rejected'
          ? 'error'
          : hasDocuments
          ? 'current'
          : 'pending',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Verification progress</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-700">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <StatusIndicator state={step.state} />
            <div>
              <p className="font-medium text-slate-900">{step.label}</p>
              <p className="text-xs text-slate-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIndicator({ state }: { state: 'complete' | 'current' | 'pending' | 'error' }) {
  const base = 'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold';
  if (state === 'complete') {
    return <span className={`${base} bg-emerald-500 text-white`}>✓</span>;
  }
  if (state === 'current') {
    return <span className={`${base} bg-amber-500 text-white`}>•</span>;
  }
  if (state === 'error') {
    return <span className={`${base} bg-rose-500 text-white`}>!</span>;
  }
  return <span className={`${base} border border-slate-300 text-slate-400`}>•</span>;
}

function DocumentsOnFileCard({ membershipCard, govIdCard }: { membershipCard: OwnerDocument | null; govIdCard: OwnerDocument | null }) {
  const docs = [
    {
      label: 'DVC Member Card',
      doc: membershipCard,
    },
    {
      label: 'Government ID',
      doc: govIdCard,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Documents on file</h2>
      <div className="mt-4 space-y-4">
        {docs.map(({ label, doc }) => (
          <div key={label} className="rounded-lg border border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            {doc ? (
              <div className="mt-1 flex items-center justify-between text-xs">
                <p className="font-medium text-emerald-600">Uploaded {dateFormatter.format(new Date(doc.created_at))}</p>
                <Link href={buildStorageUrl(doc.storage_path)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  View document
                </Link>
              </div>
            ) : (
              <p className="mt-1 text-xs text-rose-600">Not uploaded yet · we’ll need this to verify your membership.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InventorySummaryCard({
  isVerified,
  homeResort,
  useYear,
  totalOwned,
  totalAvailable,
}: {
  isVerified: boolean;
  homeResort: string | null;
  useYear: string | null;
  totalOwned: number;
  totalAvailable: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Your DVC inventory</h2>
      {isVerified ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">Home resort</dt>
            <dd className="text-base font-semibold text-slate-900">{homeResort ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Use year</dt>
            <dd className="text-base font-semibold text-slate-900">{useYear ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Points owned</dt>
            <dd className="text-base font-semibold text-slate-900">{totalOwned ? totalOwned.toLocaleString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Points available</dt>
            <dd className="text-base font-semibold text-slate-900">{totalAvailable ? totalAvailable.toLocaleString() : '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Your inventory summary will appear here after your account is verified.</p>
      )}
    </div>
  );
}
