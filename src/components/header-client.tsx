"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import UserMenu from "@/components/user-menu";
import { createClient } from "@/lib/supabase";
import AffiliatePortalHeader from "@/components/layout/AffiliatePortalHeader";
import { openIntercom } from "@/lib/intercom";
import { POLICY_LINKS } from "@/lib/policies";

const NAV_LINKS = [
  { href: "/resorts", label: "Resorts" },
  { href: "/owners", label: "Owners" },
  { href: "/guests", label: "Guests" },
  { href: "/guides", label: "Guides" },
  { href: "/our-story", label: "Get to Know" },
  { href: "/contact", label: "Contact" },
  { href: "/partners", label: "Partners" },
];

type HeaderClientProps = {
  userLabel: string | null;
  userRole: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
};

type DropdownItem = {
  label: string;
  href?: string;
  enabled?: boolean;
  note?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: "chat";
};

type DropdownSection = {
  title: string;
  items: DropdownItem[];
};

type DropdownConfig = {
  columns?: number;
  sections: DropdownSection[];
};

const DROPDOWNS: Record<string, DropdownConfig> = {
  Guests: {
    columns: 2,
    sections: [
      {
        title: "Renting",
        items: [
          { label: "Rent DVC Points", href: "/guests", icon: Sparkles },
          { label: "How Guest Renting Works", href: "/guides/how-renting-dvc-points-works", icon: BookOpen },
          { label: "Confirmed Reservations", enabled: false, icon: CheckCircle2 },
          { label: "Guest Policies & Rules", href: "/guests/policies", icon: FileText },
        ],
      },
      {
        title: "Support",
        items: [
          { label: "Guest FAQ", href: "/faq", icon: HelpCircle },
          { label: "Cancellation Policy", href: "/guests/cancellation-policy", icon: FileText },
        ],
      },
    ],
  },
  Guides: {
    columns: 2,
    sections: [
      {
        title: "DVC Basics",
        items: [
          { label: "What Are DVC Points?", href: "/guides/what-is-dvc", icon: BookOpen },
          { label: "Renting vs Owning", href: "/guides/renting-vs-owning", icon: BookOpen },
          { label: "Point Charts Explained", href: "/guides/point-charts-explained", icon: BookOpen },
        ],
      },
      {
        title: "Planning",
        items: [
          { label: "Best Resorts by Travel Style", href: "/guides/best-dvc-resorts-for-first-timers", icon: Sparkles },
          { label: "When to Rent (Booking Windows)", href: "/guides/how-renting-dvc-points-works", icon: Calendar },
          { label: "How Far in Advance to Book", enabled: false, icon: Calendar },
        ],
      },
      {
        title: "Advanced",
        items: [
          { label: "Banking & Borrowing", enabled: false, icon: FileText },
          { label: "Add-ons (Dining / Requests)", enabled: false, icon: FileText },
          { label: "Travel Insurance Overview", enabled: false, icon: ShieldCheck },
        ],
      },
    ],
  },
  "Get to Know": {
    columns: 1,
    sections: [
      {
        title: "About PixieDVC",
        items: [
          { label: "Our Approach", href: "/our-approach", icon: Sparkles },
          { label: "About Us", href: "/about-us", icon: Users },
        ],
      },
    ],
  },
  Contact: {
    columns: 2,
    sections: [
      {
        title: "Policies",
        items: POLICY_LINKS.map((policy) => ({
          label: policy.label,
          href: policy.href,
          icon: FileText,
        })),
      },
      {
        title: "General Help",
        items: [
          { label: "FAQ", href: "/faq", icon: HelpCircle },
        ],
      },
      {
        title: "Talk to a Concierge",
        items: [
          { label: "Chat with Concierge", action: "chat", icon: MessageCircle, note: "AI to human handoff" },
          { label: "Email Support", href: "mailto:hello@pixiedvc.com", icon: Mail, note: "hello@pixiedvc.com" },
          { label: "Contact Form", href: "/contact", icon: FileText },
        ],
      },
    ],
  },
  Partners: {
    columns: 1,
    sections: [
      {
        title: "Partner with PixieDVC",
        items: [
          { label: "Become a Partner", href: "/partners/become-a-partner", icon: Users },
          { label: "Affiliate Program", href: "/partners/affiliate-program", icon: Sparkles },
        ],
      },
    ],
  },
};

export default function HeaderClient({ userLabel, userRole, isAdmin, isAuthenticated }: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const navRef = useRef<HTMLDivElement | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const handleChange = () => {
      setIsDesktop(media.matches);
      if (media.matches) {
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!openDropdown) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!navRef.current) {
        return;
      }
      const target = event.target as Node;
      if (!navRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown]);

  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    closeMobile();
    router.push("/login");
    router.refresh();
  }, [closeMobile, router, supabase]);

  const toggleMobileSection = useCallback((section: string) => {
    setMobileSection((prev) => (prev === section ? null : section));
  }, []);

  const openDropdownWithDelay = useCallback((key: string) => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
    setOpenDropdown(key);
  }, []);

  const closeDropdownWithDelay = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
    closeTimeout.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 120);
  }, []);

  const handleChat = useCallback(() => {
    openIntercom();
  }, []);

  if (pathname?.startsWith("/affiliate")) {
    return (
      <AffiliatePortalHeader
        userLabel={userLabel}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  return (
    <header className="relative z-[60]">
      <div className="w-full border-b border-white/10 bg-[#0f2148]">
        <div className="mx-auto flex h-[80px] max-w-[1200px] items-center justify-between px-4 md:px-6">
          <div className="logo-overlay">
            <Link href="/" onClick={closeMobile}>
              <Image
                src="/images/pixiedvc-logo.png"
                alt="PixieDVC"
                width={1188}
                height={300}
                priority
                className="h-[96px] w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)] sm:h-[132px] md:h-[156px] lg:h-[164px]"
              />
            </Link>
            <span className="logo-sparkle" aria-hidden="true" />
          </div>

          <nav ref={navRef} className="hidden items-center gap-7 text-[15px] text-white/85 md:flex">
            {NAV_LINKS.map((item) => {
              const dropdown = DROPDOWNS[item.label];
              if (!dropdown) {
                return (
                  <Link key={item.href} href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                );
              }
              const isOpen = openDropdown === item.label;
              const alignRight =
                item.label === "Contact" || item.label === "Partners" || item.label === "Get to Know";
              const isContactMenu = item.label === "Contact";
              const effectiveColumns = Math.min(dropdown.columns, dropdown.sections.length);
              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => openDropdownWithDelay(item.label)}
                  onMouseLeave={closeDropdownWithDelay}
                >
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 transition hover:text-white"
                    onFocus={() => setOpenDropdown(item.label)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setOpenDropdown(null);
                      }
                    }}
                  >
                    {item.label}
                    <svg
                      className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
                      viewBox="0 0 12 7"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </Link>
                  {isOpen ? (
                    <div
                      className={[
                        "absolute top-full z-50 mt-2",
                        alignRight ? "right-0" : "left-0",
                        "rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90",
                        "shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]",
                        "backdrop-blur-[18px] saturate-[120%]",
                        "max-w-[calc(100vw-2rem)]",
                        "max-h-[calc(100vh-140px)] overflow-auto",
                        effectiveColumns === 1
                          ? "w-[320px]"
                          : effectiveColumns === 2
                            ? "w-[720px]"
                            : "w-[900px]",
                      ].join(" ")}
                    >
                      {(() => {
                        const renderSection = (section: NavItem) => (
                          <div key={section.title} className="space-y-3">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">
                              {section.title}
                            </p>
                            <div className="space-y-2">
                              {section.items.map((child, index) => {
                                const Icon = child.icon;
                                const itemKey = `${section.title}-${child.label}-${child.href ?? child.action ?? "static"}-${index}`;
                                if (child.action === "chat") {
                                  return (
                                    <button
                                      key={itemKey}
                                      type="button"
                                      onClick={handleChat}
                                      className="flex w-full items-start gap-3 rounded-[10px] px-3 py-2 text-left font-medium text-white/90 transition hover:bg-white/10"
                                    >
                                      {Icon ? <Icon className="mt-0.5 h-4 w-4 text-white/60" /> : null}
                                      <span>
                                        {child.label}
                                        {child.note ? (
                                          <span className="mt-1 block text-xs font-normal text-white/55">
                                            {child.note}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                  );
                                }
                                if (child.enabled === false) {
                                  return (
                                    <div
                                      key={itemKey}
                                      className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-white/40"
                                    >
                                      {Icon ? <Icon className="h-4 w-4 text-white/40" /> : null}
                                      <span className="flex-1 text-sm font-semibold">
                                        {child.label}
                                      </span>
                                    </div>
                                  );
                                }
                                if (!child.href) {
                                  return (
                                    <div
                                      key={itemKey}
                                      className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-white/70"
                                    >
                                      {Icon ? <Icon className="h-4 w-4 text-white/55" /> : null}
                                      <span className="text-sm font-semibold">{child.label}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <Link
                                    key={itemKey}
                                    href={child.href}
                                    className="flex items-start gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    {Icon ? <Icon className="mt-0.5 h-4 w-4 text-white/60" /> : null}
                                    <span>
                                      {child.label}
                                      {child.note ? (
                                        <span className="mt-1 block text-xs font-normal text-white/55">
                                          {child.note}
                                        </span>
                                      ) : null}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );

                        if (isContactMenu) {
                          const policies = dropdown.sections.find((section) => section.title === "Policies");
                          const generalHelp = dropdown.sections.find((section) => section.title === "General Help");
                          const concierge = dropdown.sections.find((section) => section.title === "Talk to a Concierge");
                          return (
                            <div className="grid w-full gap-6 sm:grid-cols-2">
                              <div className="space-y-6">
                                {policies ? renderSection(policies) : null}
                                {generalHelp ? renderSection(generalHelp) : null}
                              </div>
                              <div className="space-y-6">
                                {concierge ? renderSection(concierge) : null}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            className={[
                              "grid w-full gap-6",
                          effectiveColumns === 1
                            ? "grid-cols-1"
                            : effectiveColumns === 2
                              ? "sm:grid-cols-2"
                              : "sm:grid-cols-3",
                            ].join(" ")}
                          >
                            {dropdown.sections.map((section) => renderSection(section))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {isAuthenticated ? (
              <UserMenu label={userLabel ?? "Signed in"} isAdmin={isAdmin} userRole={userRole} />
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/40 px-4 py-1 text-sm text-white/85 transition hover:text-white"
              >
                Login
              </Link>
            )}
          </nav>

          {!isDesktop ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-white/30 p-2 text-white/80 transition hover:border-white/60 hover:text-white md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                {mobileOpen ? (
                  <>
                    <path d="M6 6l8 8" />
                    <path d="M14 6l-8 8" />
                  </>
                ) : (
                  <>
                    <path d="M3 6h14" />
                    <path d="M3 10h14" />
                    <path d="M3 14h14" />
                  </>
                )}
              </svg>
            </button>
          ) : null}
        </div>

        {mobileOpen && !isDesktop ? (
          <div className="border-t border-white/10 bg-[#0f2148] md:hidden">
            <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-4">
              <div className="grid gap-2 text-sm text-white/85">
                {NAV_LINKS.map((item) => {
                  const dropdown = DROPDOWNS[item.label];
                  if (!dropdown) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobile}
                        className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    );
                  }
                  return (
                    <div key={item.href} className="rounded-2xl border border-white/10 bg-white/5">
                      <div className="flex items-center justify-between px-3 py-2">
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          className="rounded-xl px-2 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleMobileSection(item.label)}
                          className="rounded-xl px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                          aria-expanded={mobileSection === item.label}
                          aria-label={`Toggle ${item.label} menu`}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${
                              mobileSection === item.label ? "rotate-180" : "rotate-0"
                            }`}
                            viewBox="0 0 12 7"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </button>
                      </div>
                      {mobileSection === item.label ? (
                        <div className="space-y-4 px-4 pb-4">
                          {dropdown.sections.map((section) => (
                            <div key={section.title} className="space-y-2">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                                {section.title}
                              </p>
                              <div className="grid gap-1">
                                {section.items.map((child, index) => {
                                  const itemKey = `${section.title}-${child.label}-${child.href ?? child.action ?? "static"}-${index}`;
                                  if (child.action === "chat") {
                                    return (
                                      <button
                                        key={itemKey}
                                        type="button"
                                        onClick={() => {
                                          handleChat();
                                          closeMobile();
                                        }}
                                        className="rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-white/10 hover:text-white"
                                      >
                                        {child.label}
                                      </button>
                                    );
                                  }
                                  if (child.enabled === false) {
                                    return (
                                      <div
                                        key={itemKey}
                                        className="flex items-center justify-between rounded-xl px-3 py-2 text-white/40"
                                      >
                                        <span>{child.label}</span>
                                      </div>
                                    );
                                  }
                                  if (!child.href) {
                                    return (
                                      <div key={itemKey} className="rounded-xl px-3 py-2 text-white/70">
                                        {child.label}
                                      </div>
                                    );
                                  }
                                  return (
                                    <Link
                                      key={itemKey}
                                      href={child.href}
                                      onClick={closeMobile}
                                      className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white"
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  {isAuthenticated ? "Account" : "Member Login"}
                </p>
                {isAuthenticated ? (
                  <div className="mt-3 grid gap-2 text-sm text-white/85">
                    <Link
                      href="/profile"
                      onClick={closeMobile}
                      className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white"
                    >
                      Profile
                    </Link>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={closeMobile}
                        className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white"
                      >
                        Admin
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-red-500/20 hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/85 transition hover:text-white"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-[40px] w-full border-t border-white/10 bg-[#0f2148]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-center px-4">
          <span className="text-[12px] uppercase tracking-[0.22em] text-white/60">
            Disney Vacation Club Rentals Reinvented
          </span>
        </div>
      </div>
    </header>
  );
}
