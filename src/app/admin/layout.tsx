import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminUser } from "@/lib/admin";
import AdminAccountControls from "./AdminAccountControls";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdminUser("/admin");

  return (
    <div className="admin-shell pixie-internal-buttons flex min-h-dvh flex-col bg-[#17191f] text-slate-100">
      <header className="border-b border-slate-700 bg-[#20232a]">
        <div className="mx-auto flex min-h-14 max-w-[1600px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <nav aria-label="Admin navigation" className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href="/admin" className="font-semibold text-white hover:text-blue-200">Admin</Link>
            <Link href="/admin/inbox" className="text-slate-300 hover:text-white">Inbox</Link>
            <Link href="/admin/guests" className="text-slate-300 hover:text-white">Guests</Link>
            <Link href="/admin/owners" className="text-slate-300 hover:text-white">Owners</Link>
            <Link href="/" className="text-blue-200 hover:text-white">View website ↗</Link>
          </nav>
          <AdminAccountControls label={user.email ?? "Staff account"} />
        </div>
      </header>
      <div className="admin-content flex flex-1 flex-col">{children}</div>
    </div>
  );
}
