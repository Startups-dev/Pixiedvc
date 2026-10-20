"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function AdminAccountControls({ label }: { label: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      window.dispatchEvent(new Event("hanna-admin-signout"));
      await createClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-3 text-sm">
      <span className="hidden max-w-48 truncate text-slate-300 sm:inline" title={label}>{label}</span>
      <button type="button" onClick={signOut} disabled={signingOut} className="shrink-0 rounded-md border border-slate-600 px-3 py-1.5 text-slate-100 hover:bg-slate-700 disabled:opacity-50">
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
