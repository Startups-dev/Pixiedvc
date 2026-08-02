import {
  Bell,
  BriefcaseBusiness,
  CircleDollarSign,
  Gift,
  HelpCircle,
  Home,
  LifeBuoy,
  ListChecks,
  Settings,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type OwnerNavigationSection = "primary" | "secondary";

export type OwnerNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: OwnerNavigationSection;
  match: "exact" | "prefix";
  mobilePriority?: boolean;
};

export const OWNER_NAVIGATION_ITEMS: OwnerNavigationItem[] = [
  {
    label: "Overview",
    href: "/owner/dashboard",
    icon: Home,
    section: "primary",
    match: "exact",
    mobilePriority: true,
  },
  {
    label: "Listings",
    href: "/owner/ready-stays",
    icon: ListChecks,
    section: "primary",
    match: "prefix",
    mobilePriority: true,
  },
  {
    label: "Reservations",
    href: "/owner/rentals",
    icon: BriefcaseBusiness,
    section: "primary",
    match: "prefix",
    mobilePriority: true,
  },
  {
    label: "Earnings",
    href: "/owner/dashboard?tab=earnings",
    icon: CircleDollarSign,
    section: "primary",
    match: "exact",
  },
  {
    label: "Payouts",
    href: "/owner/payouts",
    icon: WalletCards,
    section: "primary",
    match: "prefix",
  },
  {
    label: "Notifications",
    href: "/owner/notifications",
    icon: Bell,
    section: "primary",
    match: "prefix",
  },
  {
    label: "Account",
    href: "/owner/memberships",
    icon: Settings,
    section: "secondary",
    match: "prefix",
  },
  {
    label: "Resources",
    href: "/owner/ready-stays/faq",
    icon: HelpCircle,
    section: "secondary",
    match: "prefix",
  },
  {
    label: "Rewards",
    href: "/owner/rewards",
    icon: Gift,
    section: "secondary",
    match: "prefix",
  },
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
    section: "secondary",
    match: "exact",
  },
];

export const OWNER_ROUTE_TITLES: Array<{ href: string; title: string; match: "exact" | "prefix" }> = [
  { href: "/owner/dashboard", title: "Overview", match: "exact" },
  { href: "/owner/ready-stays", title: "Ready Stays", match: "prefix" },
  { href: "/owner/rentals", title: "Reservations", match: "prefix" },
  { href: "/owner/matches", title: "Owner Matches", match: "prefix" },
  { href: "/owner/payouts", title: "Payouts", match: "prefix" },
  { href: "/owner/notifications", title: "Notifications", match: "prefix" },
  { href: "/owner/memberships", title: "Account", match: "prefix" },
  { href: "/owner/rewards", title: "Rewards", match: "prefix" },
  { href: "/owner/pricing-intelligence", title: "Pricing Intelligence", match: "prefix" },
  { href: "/owner/liquidation-opportunities", title: "Point Opportunities", match: "prefix" },
  { href: "/owner/verification", title: "Verification", match: "prefix" },
  { href: "/owner/onboarding/agreement", title: "Owner Agreement", match: "prefix" },
  { href: "/owner/onboarding", title: "Owner Onboarding", match: "prefix" },
  { href: "/owner/submitted", title: "Application Submitted", match: "prefix" },
];

const ACTIVE_PARENT_BY_PREFIX: Array<{ prefix: string; parentHref: string }> = [
  { prefix: "/owner/matches", parentHref: "/owner/rentals" },
  { prefix: "/owner/ready-stays", parentHref: "/owner/ready-stays" },
  { prefix: "/owner/rentals", parentHref: "/owner/rentals" },
  { prefix: "/owner/memberships", parentHref: "/owner/memberships" },
  { prefix: "/owner/payouts", parentHref: "/owner/payouts" },
  { prefix: "/owner/notifications", parentHref: "/owner/notifications" },
  { prefix: "/owner/rewards", parentHref: "/owner/rewards" },
];

function getPathnameOnly(value: string) {
  return value.split("?")[0] ?? value;
}

export function isOwnerRoute(pathname: string | null | undefined) {
  return pathname === "/owner" || Boolean(pathname?.startsWith("/owner/"));
}

export function isOwnerNavigationItemActive(item: OwnerNavigationItem, pathname: string | null | undefined) {
  if (!pathname) return false;
  const normalizedPathname = pathname === "/owner" ? "/owner/dashboard" : pathname;
  const normalizedPathOnly = getPathnameOnly(normalizedPathname);
  const itemPathOnly = getPathnameOnly(item.href);
  if (item.href.includes("?")) {
    return normalizedPathname === item.href;
  }
  const parent = ACTIVE_PARENT_BY_PREFIX.find(({ prefix }) => normalizedPathname.startsWith(prefix));
  if (parent) {
    return item.href === parent.parentHref;
  }
  if (item.match === "exact") {
    return normalizedPathname === item.href;
  }
  return normalizedPathOnly === itemPathOnly || normalizedPathOnly.startsWith(`${itemPathOnly}/`);
}

export function getOwnerPageTitle(pathname: string | null | undefined) {
  if (!pathname || pathname === "/owner") return "Overview";
  const match = OWNER_ROUTE_TITLES.find((item) =>
    item.match === "exact" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title ?? "Owner Workspace";
}

export function getOwnerNavigationBySection(section: OwnerNavigationSection) {
  return OWNER_NAVIGATION_ITEMS.filter((item) => item.section === section);
}

export function getOwnerMobilePriorityNavigation() {
  return OWNER_NAVIGATION_ITEMS.filter((item) => item.mobilePriority);
}
