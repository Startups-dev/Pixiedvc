"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResortInfoSection } from "@/lib/resort-sections";

type Props = {
  sections: ResortInfoSection[];
};

function labelFor(section: ResortInfoSection) {
  if (section.type === "overview") return "About This Resort";
  if (section.type === "transportation") return "Getting Around";
  if (section.type === "amenities") return "What You Get with PixieDVC";
  if (section.type === "policies") return "Good to Know";
  return section.title;
}

export default function ResortSectionNav({ sections }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [showNav, setShowNav] = useState(true);

  const ids = useMemo(() => sections.map((section) => section.id), [sections]);

  useEffect(() => {
    if (!ids.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      {
        rootMargin: "-30% 0px -60% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [ids]);

  useEffect(() => {
    const handleVisibility = () => {
      const essentials = document.getElementById("essentials");
      if (!essentials) {
        setShowNav(true);
        return;
      }
      const top = essentials.getBoundingClientRect().top;
      setShowNav(top > 96);
    };

    handleVisibility();
    window.addEventListener("scroll", handleVisibility, { passive: true });
    window.addEventListener("resize", handleVisibility);
    return () => {
      window.removeEventListener("scroll", handleVisibility);
      window.removeEventListener("resize", handleVisibility);
    };
  }, []);

  function handleClick(id: string) {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!sections.length) {
    return null;
  }

  if (!showNav) {
    return null;
  }

  return (
    <div className="sticky top-24 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex gap-2 overflow-x-auto py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F2148]/60">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleClick(section.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 transition ${
                  isActive
                    ? "border-[#0F2148]/40 bg-[#0F2148]/10 text-[#0F2148]"
                    : "border-transparent bg-transparent text-[#0F2148]/60 hover:border-[#0F2148]/20 hover:bg-[#0F2148]/5"
                }`}
              >
                {labelFor(section)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
