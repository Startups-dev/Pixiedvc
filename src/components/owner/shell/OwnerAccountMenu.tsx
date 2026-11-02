"use client";

import OwnerAvatar from "@/components/owner/shell/OwnerAvatar";
import UserMenu from "@/components/user-menu";
import type { OwnerShellIdentity } from "@/lib/owner/identity-types";
import type { DashboardDestination } from "@/lib/routes/home";

export default function OwnerAccountMenu({ identity, dashboards = [] }: {
  identity: OwnerShellIdentity;
  dashboards?: DashboardDestination[];
}) {
  return (
    <UserMenu
      label={identity.displayName ?? identity.email ?? "Owner"}
      dashboards={dashboards}
      variant="owner"
      currentDashboard="owner"
      triggerContent={
        <>
          <OwnerAvatar displayName={identity.displayName} avatarUrl={identity.avatarUrl} initials={identity.initials} />
          <span className="hidden leading-tight sm:block">
            <span className="block max-w-[150px] truncate text-[13px] font-semibold">
              {identity.displayName ?? identity.email ?? "Owner"}
            </span>
            <span className="block max-w-[150px] truncate text-[11px] font-medium text-[#64748B]">
              {identity.email ?? "Account"}
            </span>
          </span>
        </>
      }
    />
  );
}
