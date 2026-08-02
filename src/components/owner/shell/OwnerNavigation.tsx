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
                  "group flex min-h-11 items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10224A]",
                  active
                    ? "bg-white/10 text-white shadow-[inset_3px_0_0_#E5C05A]"
                    : "text-white/72 hover:bg-white/[0.07] hover:text-white",
                ].join(" ")}
              >
                <Icon
                  className={active ? "h-[18px] w-[18px] text-[#E5C05A]" : "h-[18px] w-[18px] text-white/48 group-hover:text-white/72"}
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
