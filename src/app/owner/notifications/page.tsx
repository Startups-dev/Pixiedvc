import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensureApprovalNotifications,
  ensurePointsExpiringNotification,
  getOwnerMemberships,
  getOwnerNotifications,
  getOwnerRentals,
} from "@/lib/owner-data";
import NotificationList from "@/components/owner/NotificationList";

export default async function OwnerNotificationsPage() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/notifications");
  }

  const [memberships, rentals] = await Promise.all([
    getOwnerMemberships(user.id, cookieStore),
    getOwnerRentals(user.id, cookieStore),
  ]);

  await Promise.all([
    ensurePointsExpiringNotification(user.id, memberships),
    ensureApprovalNotifications(user.id, rentals),
  ]);

  const notifications = await getOwnerNotifications(user.id, cookieStore);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <Link href="/owner/dashboard" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold text-ink">Notifications</h1>
        <p className="text-sm text-muted">Approvals, confirmations, payouts, and expiring points.</p>
      </header>

      <Card>
        <NotificationList notifications={notifications} />
      </Card>
    </div>
  );
}
