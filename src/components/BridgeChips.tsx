"use client";

import { useEffect, useRef, useState } from "react";

const chips = ["Verified owners", "Secure payments", "Concierge-led"];

export default function BridgeChips() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);
    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current || reduceMotion) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-center justify-center gap-3">
      {chips.map((chip, index) => (
        <span
          key={chip}
          className={`inline-flex items-center rounded-full border border-[#0B1B3A]/15 bg-white px-4 py-1 text-xs font-medium text-[#0B1B3A] transition-all ${
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.96]"
          }`}
          style={{
            transitionDuration: "140ms",
            transitionTimingFunction: "ease-out",
            transitionDelay: `${index * 100}ms`,
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
