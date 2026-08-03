"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getOwnerNavigationBySection,
  isOwnerNavigationItemActive,
  type OwnerNavigationSection,
} from "@/components/owner/shell/owner-navigation";

type OwnerNavigationProps = {
  section: OwnerNavigationSection;
  onNavigate?: () => void;
};

export default function OwnerNavigation({ section, onNavigate }: OwnerNavigationProps) {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState<string | null>(pathname);
  const items = getOwnerNavigationBySection(section);

  useEffect(() => {
    const search = window.location.search;
    setActivePath(search ? `${pathname}${search}` : pathname);
  }, [pathname]);

  return (
    <nav aria-label={section === "primary" ? "Owner primary navigation" : "Owner secondary navigation"}>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isOwnerNavigationItemActive(item, activePath);
          return (
            <li key={`${section}-${item.href}-${item.label}`}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1B33]",
                  active
                    ? "bg-white/10 text-white shadow-[inset_3px_0_0_#D4AF37]"
                    : "text-white/72 hover:bg-white/[0.065] hover:text-white",
                ].join(" ")}
              >
                <Icon
                  className={active ? "h-[17px] w-[17px] text-[#D4AF37]" : "h-[17px] w-[17px] text-white/52 group-hover:text-white/72"}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
