"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { trackPixieEvent } from "@/lib/pixie/client/analytics";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixieSavePrompt({ state, onShown }: { state: PixieChatState; onShown: () => void }) {
  const shouldShow = state.completeness.score >= 35 || Boolean(state.recommendations?.recommendations.length) || Boolean(state.readyStayMatches?.matches.length);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shouldShow && !shownRef.current) {
      shownRef.current = true;
      onShown();
    }
  }, [shouldShow, onShown]);

  if (!shouldShow) return null;

  return (
    <section className="rounded-2xl border border-[#0f2148]/15 bg-[#0f2148] p-4 text-white shadow-sm">
      <h2 className="text-sm font-semibold text-white">Your plan is taking shape.</h2>
      <p className="mt-2 text-sm leading-6 text-white/80">
        Sign in to keep using this browser draft after you return. Server-side saved trips come in a later phase.
      </p>
      <Link
        href="/login?mode=signup&next=%2Fpixie&intent=pixie"
        onClick={() => trackPixieEvent("pixie_login_clicked", { stage: state.tripState.planningStage })}
        className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0f2148]"
      >
        Sign in to continue
      </Link>
    </section>
  );
}
