import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerNotifications } from "@/lib/owner-data";
import NotificationList from "@/components/owner/NotificationList";
import { buildOwnerNotificationListItems } from "@/lib/owner/secondary-subpages";

export default async function OwnerNotificationsPage() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/notifications");
  }

  const notifications = await getOwnerNotifications(user.id, cookieStore);
  const notificationItems = buildOwnerNotificationListItems(notifications);

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner notifications"
        title="Notifications"
        description="Review owner approvals, confirmations, payout updates, and account reminders."
        summary={`${notificationItems.filter((note) => !note.read).length} unread`}
      />

      <NotificationList notifications={notificationItems} />
    </div>
  );
}
