"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function OwnerSubmittedPage() {
  const router = useRouter();
  const redirectPath = "/owner/dashboard";

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push(redirectPath);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [router, redirectPath]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-slate-50">
      <div className="relative mb-6 flex items-center justify-center">
        <Image src="/castle-celebration.gif" alt="Castle celebration" width={280} height={320} className="w-64 h-auto" priority />
        <div className="firework firework-one" aria-hidden />
        <div className="firework firework-two" aria-hidden />
      </div>

      <h1 className="text-3xl font-semibold text-slate-900">Your Owner Application Has Been Submitted!</h1>

      <p className="mt-4 max-w-md text-slate-600">
        Thank you for submitting your DVC ownership details. Our verification team is reviewing your documents. We’ll email you as soon as your account is approved.
      </p>

      <p className="mt-8 text-sm text-slate-500">Redirecting you to your Owner Dashboard…</p>
    </div>
  );
}
