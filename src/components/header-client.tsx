"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
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
  hasAffiliateAccess: boolean;
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

const CARET_CLASS_BY_OPEN: Record<"open" | "closed", string> = {
  open: "h-3 w-3 rotate-180 transition-transform",
  closed: "h-3 w-3 rotate-0 transition-transform",
};

const MOBILE_CARET_CLASS_BY_OPEN: Record<"open" | "closed", string> = {
  open: "h-4 w-4 rotate-180 transition-transform",
  closed: "h-4 w-4 rotate-0 transition-transform",
};

const DROPDOWN_GRID_CLASS_BY_COLUMNS: Record<1 | 2 | 3, string> = {
  1: "grid w-full gap-6 grid-cols-1",
  2: "grid w-full gap-6 sm:grid-cols-2",
  3: "grid w-full gap-6 sm:grid-cols-3",
};

const DROPDOWN_PANEL_CLASS_BY_LAYOUT: Record<
  "left-1" | "left-2" | "left-3" | "right-1" | "right-2" | "right-3",
  string
> = {
  "left-1":
    "absolute top-full z-[120] mt-2 left-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[320px]",
  "left-2":
    "absolute top-full z-[120] mt-2 left-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[720px]",
  "left-3":
    "absolute top-full z-[120] mt-2 left-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[900px]",
  "right-1":
    "absolute top-full z-[120] mt-2 right-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[320px]",
  "right-2":
    "absolute top-full z-[120] mt-2 right-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[720px]",
  "right-3":
    "absolute top-full z-[120] mt-2 right-0 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-5 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-auto w-[900px]",
};

const DROPDOWNS: Record<string, DropdownConfig> = {
  Guests: {
    columns: 2,
    sections: [
      {
        title: "Renting",
        items: [
          { label: "Rent DVC Points", href: "/guests", icon: Sparkles },
          { label: "Disney Dining Plans", href: "/dining-plan", icon: FileText },
          { label: "Ready Stays (Instant Booking)", href: "/ready-stays", icon: Calendar },
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
          { label: "Affiliate Program", href: "/partners/affiliate-program", icon: Sparkles },
          { label: "Travel Advisors", href: "/partners#advisor", icon: Users },
          { label: "Service Providers", href: "/partners#service", icon: Sparkles },
        ],
      },
    ],
  },
};

export default function HeaderClient({
  userLabel,
  userRole,
  isAdmin,
  isAuthenticated,
  hasAffiliateAccess,
}: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLDivElement | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
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
    await createClient().auth.signOut();
    closeMobile();
    router.push("/login");
    router.refresh();
  }, [closeMobile, router]);

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
    const opened = openIntercom();
    setOpenDropdown(null);
    if (!opened) {
      router.push("/support");
    }
  }, [router]);
  const ownerJoinHref = "/owners";
  const ownerPortalHref = isAuthenticated
    ? "/owner/dashboard"
    : "/login?redirect=/owner/dashboard&intent=owner";
  const ownerDropdown: DropdownConfig = {
    columns: 1,
    sections: [
      {
        title: "Owner Access",
        items: [
          { label: "Join as an Owner", href: ownerJoinHref, icon: Users },
          { label: "Owner Dashboard", href: ownerPortalHref, icon: ShieldCheck },
        ],
      },
    ],
  };

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
    <header className="relative z-[100] w-full overflow-visible">
      <div className="w-full border-b border-white/10 bg-[#0f2148] pt-4">
        <div className="mx-auto flex h-[80px] w-full max-w-[1200px] items-center px-4 md:px-6">
          <div className="shrink-0">
            <div className="logo-overlay">
              <Link href="/" onClick={closeMobile}>
                <Image
                  src="/images/Pixiedvc-logo.png"
                  alt="PixieDVC"
                  width={1188}
                  height={300}
                  priority
                  className="h-[96px] w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)] sm:h-[132px] md:h-[156px] lg:h-[164px]"
                />
              </Link>
              <span className="logo-sparkle" aria-hidden="true" />
            </div>
          </div>

          <nav ref={navRef} className="hidden min-w-0 flex-1 items-center justify-center px-3 text-[15px] text-white/85 lg:flex">
            <div className="flex min-w-0 items-center gap-5 lg:gap-7">
              {NAV_LINKS.map((item) => {
                const dropdown = item.label === "Owners" ? ownerDropdown : DROPDOWNS[item.label];
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
                const effectiveColumns = Math.min(dropdown.columns ?? dropdown.sections.length, dropdown.sections.length);
                const normalizedColumns: 1 | 2 | 3 =
                  effectiveColumns <= 1 ? 1 : effectiveColumns === 2 ? 2 : 3;
                const panelClassKey: "left-1" | "left-2" | "left-3" | "right-1" | "right-2" | "right-3" =
                  alignRight
                    ? normalizedColumns === 1
                      ? "right-1"
                      : normalizedColumns === 2
                        ? "right-2"
                        : "right-3"
                    : normalizedColumns === 1
                      ? "left-1"
                      : normalizedColumns === 2
                        ? "left-2"
                        : "left-3";
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
                        className={isOpen ? CARET_CLASS_BY_OPEN.open : CARET_CLASS_BY_OPEN.closed}
                        viewBox="0 0 12 7"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </Link>
                    {isOpen ? (
                      <div className={DROPDOWN_PANEL_CLASS_BY_LAYOUT[panelClassKey]}>
                        {(() => {
                          const renderSection = (section: DropdownSection) => (
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
                            <div className={DROPDOWN_GRID_CLASS_BY_COLUMNS[normalizedColumns]}>
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
                <UserMenu
                  label={userLabel ?? "Signed in"}
                  isAdmin={isAdmin}
                  userRole={userRole}
                  hasAffiliateAccess={hasAffiliateAccess}
                />
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-white/50 bg-white/6 px-4 py-1 text-sm text-white/92 transition hover:border-white/65 hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>

          {!isDesktop ? (
            <button
              type="button"
              className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full border border-white/30 p-2 text-white/80 transition hover:border-white/60 hover:text-white lg:hidden"
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
          <div className="border-t border-white/10 bg-[#0f2148] lg:hidden">
            <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-4">
              <div className="grid gap-2 text-sm text-white/85">
                {NAV_LINKS.map((item) => {
                  const dropdown = item.label === "Owners" ? ownerDropdown : DROPDOWNS[item.label];
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
                            className={
                              mobileSection === item.label
                                ? MOBILE_CARET_CLASS_BY_OPEN.open
                                : MOBILE_CARET_CLASS_BY_OPEN.closed
                            }
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
                  {isAuthenticated ? "Account" : "Member Sign In"}
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
                    {hasAffiliateAccess ? (
                      <Link
                        href="/affiliate/dashboard"
                        onClick={closeMobile}
                        className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white"
                      >
                        Affiliate Portal
                      </Link>
                    ) : null}
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
                  <div className="mt-3 grid gap-2">
                    <Link
                      href="/login"
                      onClick={closeMobile}
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/40 px-4 py-2 text-sm font-semibold !text-white transition hover:!text-white"
                    >
                      Sign in
                    </Link>
                  </div>
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
