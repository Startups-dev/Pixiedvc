"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  resortName: string;
};

export default function StickyCTA({ resortName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 360);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-full bg-[#0F2148] px-5 py-3 text-white shadow-xl ring-1 ring-white/10">
        <span className="text-sm md:text-base">
          Ready to stay at <strong>{resortName}</strong>?
        </span>
        <Link
          href="/trip-builder"
          className="rounded-full bg-gradient-to-r from-[#d9a64f] to-[#f6e58d] px-4 py-1.5 text-sm font-semibold text-[#0F2148] transition hover:brightness-105"
        >
          View Availability
        </Link>
      </div>
    </div>
  );
}
