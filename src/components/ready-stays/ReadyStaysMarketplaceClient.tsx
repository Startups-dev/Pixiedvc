"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import { resolveReadyStaySignals } from "@/lib/ready-stays/signal-engine";
import { resolveResortImage } from "@/lib/resort-image";
import { getReadyStayGuestTotalCents } from "@/lib/ready-stays/test-pricing";
import { resolveReadyStaySearchDateFilters, type ReadyStayDateMode } from "@/lib/ready-stays/search";
import { buildTripIntentQuery } from "@/lib/trip-intent";

type ReadyStayRow = {
  id: string;
  resort_id: string;
  check_in: string;
  check_out: string;
  points: number;
  room_type: string;
  season_type: string;
  guest_price_per_point_cents: number;
  original_guest_price_per_point_cents: number | null;
  price_reduced_at: string | null;
  is_test_listing?: boolean | null;
  test_guest_total_cents?: number | null;
  resorts?: {
    name?: string | null;
    slug?: string | null;
    calculator_code?: string | null;
  } | null;
};

type ResortOption = {
  id: string;
  name: string;
  slug?: string | null;
  calculator_code?: string | null;
};

type SearchParams = {
  resort?: string;
  dateMode?: string;
  checkIn?: string;
  checkOut?: string;
  month?: string;
  holiday?: string;
  price_min?: string;
  price_max?: string;
  points_min?: string;
  points_max?: string;
  sort?: string;
  adults?: string;
  children?: string;
  nights?: string;
};

const HOLIDAY_TAGS = [
  { value: "christmas", label: "Christmas" },
  { value: "halloween", label: "Halloween" },
  { value: "marathon", label: "Marathon" },
  { value: "spring_break", label: "Spring Break" },
];

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const date =
    year && month && day
      ? new Date(year, month - 1, day)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getFlexibleYearOptions() {
  const currentYear = new Date().getFullYear();
  return [String(currentYear), String(currentYear + 1)];
}

function getFlexibleMonthOptions(selectedYearValue: string, now = new Date()) {
  const currentYear = now.getFullYear();
  const selectedYear = Number(selectedYearValue) || currentYear;
  const firstAvailableMonth = new Date(currentYear, now.getMonth(), 1);

  return FLEXIBLE_MONTHS.map((month) => {
    const monthDate = new Date(selectedYear, Number(month.value) - 1, 1);
    return {
      ...month,
      disabled: monthDate < firstAvailableMonth,
    };
  });
}

const FLEXIBLE_MONTHS = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: String(monthIndex + 1).padStart(2, "0"),
  label: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2020, monthIndex, 1))),
}));

function buildFlexibleBrowseHref(searchParams: SearchParams) {
  const params = new URLSearchParams({ dateMode: "flexible" });
  for (const key of ["resort", "sort", "price_min", "price_max", "points_min", "points_max", "adults", "children", "nights"] as const) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  if (searchParams.dateMode === "flexible" && searchParams.holiday) {
    params.set("holiday", searchParams.holiday);
  }
  return `/ready-stays?${params.toString()}`;
}

function nightsBetweenDates(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return undefined;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : undefined;
}

function parseCount(value?: string, allowZero = false) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= (allowZero ? 0 : 1) ? parsed : undefined;
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function estimatedSleeps(roomType: string) {
  const normalized = roomType.toLowerCase();
  if (normalized.includes("studio")) return 4;
  if (normalized.includes("1") && normalized.includes("bed")) return 5;
  if (normalized.includes("2") && normalized.includes("bed")) return 8;
  if (normalized.includes("3") && normalized.includes("bed")) return 12;
  return 4;
}

function imageIndexFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 5;
  }
  return (hash % 5) + 1;
}

function holidayPriority(seasonType: string | null) {
  switch (seasonType) {
    case "christmas":
      return 4;
    case "marathon":
      return 3;
    case "halloween":
      return 2;
    case "spring_break":
      return 1;
    default:
      return 0;
  }
}

function sortReadyStays(list: ReadyStayRow[], sort: string) {
  const sorted = [...list];
  switch (sort) {
    case "featured":
      return sorted.sort((a, b) => {
        const checkInDelta = a.check_in.localeCompare(b.check_in);
        if (checkInDelta !== 0) return checkInDelta;
        const markdownDelta = Number(Boolean(b.price_reduced_at)) - Number(Boolean(a.price_reduced_at));
        if (markdownDelta !== 0) return markdownDelta;
        const holidayDelta = holidayPriority(b.season_type) - holidayPriority(a.season_type);
        if (holidayDelta !== 0) return holidayDelta;
        const totalA = getReadyStayGuestTotalCents(a);
        const totalB = getReadyStayGuestTotalCents(b);
        return totalB - totalA;
      });
    case "price_asc":
      return sorted.sort((a, b) => getReadyStayGuestTotalCents(a) - getReadyStayGuestTotalCents(b));
    case "price_desc":
      return sorted.sort((a, b) => getReadyStayGuestTotalCents(b) - getReadyStayGuestTotalCents(a));
    case "check_in":
      return sorted.sort((a, b) => a.check_in.localeCompare(b.check_in));
    case "points_asc":
      return sorted.sort((a, b) => a.points - b.points);
    default:
      return sorted;
  }
}

export default function ReadyStaysMarketplaceClient({
  readyStays,
  resorts,
  searchParams,
}: {
  readyStays: ReadyStayRow[];
  resorts: ResortOption[];
  searchParams: SearchParams;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resortQuery, setResortQuery] = useState(() => {
    const match = resorts.find((resort) => resort.id === searchParams.resort);
    return match?.name ?? "";
  });
  const [resortId, setResortId] = useState(searchParams.resort ?? "");
  const [sort, setSort] = useState(searchParams.sort ?? "featured");
  const [dateMode, setDateMode] = useState<ReadyStayDateMode>(
    () => resolveReadyStaySearchDateFilters(searchParams).dateMode,
  );
  const [checkIn, setCheckIn] = useState(searchParams.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(searchParams.checkOut ?? "");
  const initialMonthParts = searchParams.month?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const [preferredMonth, setPreferredMonth] = useState(initialMonthParts?.[2] ?? "");
  const [preferredYear, setPreferredYear] = useState(initialMonthParts?.[1] ?? "");
  const flexibleYearOptions = getFlexibleYearOptions();
  const flexibleMonthOptions = getFlexibleMonthOptions(preferredYear);
  const appliedPreferredMonth = preferredMonth && preferredYear ? `${preferredYear}-${preferredMonth}` : "";
  const [holiday, setHoliday] = useState(searchParams.holiday ?? "");

  const sortedReadyStays = useMemo(() => sortReadyStays(readyStays, sort), [readyStays, sort]);
  const appliedDateFilters = resolveReadyStaySearchDateFilters(searchParams);
  const flexibleBrowseHref = buildFlexibleBrowseHref(searchParams);
  const selectedResort = resorts.find((resort) => resort.id === searchParams.resort);
  const exactDateIntent = buildTripIntentQuery({
    checkIn: appliedDateFilters.dateMode === "specific" ? appliedDateFilters.checkIn : undefined,
    checkOut: appliedDateFilters.dateMode === "specific" ? appliedDateFilters.checkOut : undefined,
    nights: parseCount(searchParams.nights) ?? nightsBetweenDates(appliedDateFilters.checkIn, appliedDateFilters.checkOut),
    resort: selectedResort?.slug ?? selectedResort?.calculator_code ?? undefined,
    adults: parseCount(searchParams.adults),
    children: parseCount(searchParams.children, true),
  }).toString();
  const requestExactDatesHref = exactDateIntent ? `/calculator?${exactDateIntent}` : "/calculator";
  const selectedResortName = selectedResort?.name;

  const hasActiveFilters = Boolean(
    searchParams.resort ||
      searchParams.checkIn ||
      searchParams.checkOut ||
      searchParams.month ||
      searchParams.holiday ||
      searchParams.price_min ||
      searchParams.price_max ||
      searchParams.points_min ||
      searchParams.points_max,
  );

  const handleResortChange = (value: string) => {
    setResortQuery(value);
    const match = resorts.find((resort) => resort.name.toLowerCase() === value.toLowerCase());
    setResortId(match?.id ?? "");
  };

  const renderFilters = (variant: "sidebar" | "drawer") => (
    <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <form method="get" className="space-y-5">
        <input type="hidden" name="resort" value={resortId} />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dateMode" value={dateMode} />
        {searchParams.adults ? <input type="hidden" name="adults" value={searchParams.adults} /> : null}
        {searchParams.children ? <input type="hidden" name="children" value={searchParams.children} /> : null}
        {searchParams.nights ? <input type="hidden" name="nights" value={searchParams.nights} /> : null}

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Travel dates</legend>
          <div className="grid gap-2">
            {([
              ["specific", "I have specific dates"],
              ["flexible", "My dates are flexible"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={dateMode === mode}
                onClick={() => setDateMode(mode)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  dateMode === mode
                    ? "border-[#0F2148] bg-[#0F2148]/10 text-[#0F2148]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {dateMode === "specific" ? (
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Check-in</span>
              <input
                name="checkIn"
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="mt-2 box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Check-out</span>
              <input
                name="checkOut"
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="mt-2 box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm"
              />
            </label>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">TRAVEL MONTH</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor={`ready-stays-travel-month-${variant}`} className="sr-only">Month</label>
                <select
                  id={`ready-stays-travel-month-${variant}`}
                  aria-label="Month"
                  value={preferredMonth}
                  onChange={(event) => {
                    setPreferredMonth(event.target.value);
                    if (!event.target.value) setPreferredYear("");
                  }}
                  className="box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Month</option>
                  {FLEXIBLE_MONTHS.map((month) => (
                    <option
                      key={month.value}
                      value={month.value}
                      disabled={flexibleMonthOptions.find((option) => option.value === month.value)?.disabled}
                    >
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`ready-stays-travel-year-${variant}`} className="sr-only">Year</label>
                <select
                  id={`ready-stays-travel-year-${variant}`}
                  aria-label="Year"
                  value={preferredYear}
                  onChange={(event) => {
                    const nextYear = event.target.value;
                    setPreferredYear(nextYear);
                    const selectedMonthIsUnavailable = getFlexibleMonthOptions(nextYear)
                      .find((month) => month.value === preferredMonth)?.disabled;
                    if (!nextYear || selectedMonthIsUnavailable) setPreferredMonth("");
                  }}
                  className="box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Year</option>
                  {flexibleYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
            {appliedPreferredMonth ? <input type="hidden" name="month" value={appliedPreferredMonth} /> : null}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Resort</span>
          <input
            list={`ready-stays-resorts-${variant}`}
            value={resortQuery}
            onChange={(event) => handleResortChange(event.target.value)}
            placeholder="Search resort"
            className="mt-2 box-border w-full min-w-0 max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <datalist id={`ready-stays-resorts-${variant}`}>
            {resorts.map((resort) => (
              <option key={resort.id} value={resort.name} />
            ))}
          </datalist>
        </label>

        {dateMode === "flexible" ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Holiday</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {HOLIDAY_TAGS.map((tag) => (
                <label key={tag.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="holiday"
                    value={tag.value}
                    checked={holiday === tag.value}
                    onChange={() => setHoliday(tag.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition peer-checked:border-[#0F2148] peer-checked:bg-[#0F2148]/10 peer-checked:text-[#0F2148]">
                    {tag.label}
                  </span>
                </label>
              ))}
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="holiday"
                  value=""
                  checked={!holiday}
                  onChange={() => setHoliday("")}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition peer-checked:border-[#0F2148] peer-checked:bg-[#0F2148]/10 peer-checked:text-[#0F2148]">
                  Any
                </span>
              </label>
            </div>
          </div>
        ) : null}

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Price per point</span>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-muted">
            <label className="space-y-1">
              <span>Min</span>
              <input
                name="price_min"
                type="number"
                inputMode="numeric"
                defaultValue={searchParams.price_min ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span>Max</span>
              <input
                name="price_max"
                type="number"
                inputMode="numeric"
                defaultValue={searchParams.price_max ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Points</span>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-muted">
            <label className="space-y-1">
              <span>Min</span>
              <input
                name="points_min"
                type="number"
                inputMode="numeric"
                defaultValue={searchParams.points_min ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span>Max</span>
              <input
                name="points_max"
                type="number"
                inputMode="numeric"
                defaultValue={searchParams.points_max ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" className="w-full">
            Apply filters
          </Button>
          {hasActiveFilters ? (
            <Link href="/ready-stays" className="text-xs font-semibold text-muted hover:text-ink">
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">{renderFilters("sidebar")}</div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-semibold">
            {appliedDateFilters.dateMode === "specific" ? "Specific dates" : "Flexible dates"}
          </p>
          <p className="mt-1">
            {appliedDateFilters.dateMode === "specific"
              ? `${appliedDateFilters.checkIn && appliedDateFilters.checkOut
                  ? `Only pre-confirmed stays with check-in ${formatDate(appliedDateFilters.checkIn)} and check-out ${formatDate(appliedDateFilters.checkOut)} are shown.`
                  : appliedDateFilters.checkIn
                    ? `Showing pre-confirmed stays with check-in on ${formatDate(appliedDateFilters.checkIn)}.`
                    : appliedDateFilters.checkOut
                      ? `Showing pre-confirmed stays with check-out on ${formatDate(appliedDateFilters.checkOut)}.`
                      : "Choose dates to find a pre-confirmed stay."} Existing stays have fixed dates and cannot be moved.${selectedResortName ? ` Resort: ${selectedResortName}.` : ""}`
              : appliedDateFilters.month
                ? `Showing pre-confirmed stays that overlap ${formatMonth(appliedDateFilters.month)}. Each stay has fixed dates and cannot be moved.${selectedResortName ? ` Resort: ${selectedResortName}.` : ""}`
                : `Browsing all available months. Ready Stays are pre-confirmed reservations with fixed dates.${selectedResortName ? ` Resort: ${selectedResortName}.` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {sortedReadyStays.length > 0 ? (
              <p className="text-sm text-muted">{sortedReadyStays.length} Ready Stays currently available</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 lg:hidden"
            >
              Filters
            </button>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="check_in">Check-in: Soonest</option>
                <option value="points_asc">Points: Low to High</option>
              </select>
            </label>
          </div>
        </div>

        {sortedReadyStays.length === 0 ? (
          <Card className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-ink">
              {appliedDateFilters.dateMode === "specific" && (appliedDateFilters.checkIn || appliedDateFilters.checkOut)
                ? appliedDateFilters.checkIn && appliedDateFilters.checkOut
                  ? "No Ready Stays match these dates"
                  : `No Ready Stays match this ${appliedDateFilters.checkIn ? "check-in" : "check-out"} date`
                : appliedDateFilters.month
                  ? `No Ready Stays overlap ${formatMonth(appliedDateFilters.month)}`
                  : hasActiveFilters
                    ? "No Ready Stays match your filters"
                    : "No Ready Stays available right now."}
            </p>
            {appliedDateFilters.dateMode === "specific" && (appliedDateFilters.checkIn || appliedDateFilters.checkOut) ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {`We couldn’t find a pre-confirmed stay${selectedResortName ? ` at ${selectedResortName}` : ""} for ${appliedDateFilters.checkIn && appliedDateFilters.checkOut
                    ? `${formatDate(appliedDateFilters.checkIn)}–${formatDate(appliedDateFilters.checkOut)}`
                    : appliedDateFilters.checkIn
                      ? `check-in on ${formatDate(appliedDateFilters.checkIn)}`
                      : `check-out on ${formatDate(appliedDateFilters.checkOut!)}`}. Ready Stays have fixed travel dates. You can explore other dates or request your trip through our custom owner-matching service.`}
                </p>
                <Button asChild className="mt-5">
                  <Link href={requestExactDatesHref} className="!text-white">Request These Exact Dates</Link>
                </Button>
                <Button asChild className="mt-3 sm:ml-3">
                  <Link href={flexibleBrowseHref} className="!text-white">Explore Flexible Dates</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 sm:ml-3"
                  onClick={() => {
                    setDateMode("specific");
                    setFiltersOpen(true);
                  }}
                >
                  Change My Dates
                </Button>
              </>
            ) : null}
            {appliedDateFilters.dateMode === "flexible" && !appliedDateFilters.month ? (
              <p className="mt-2 text-sm text-muted">
                No pre-confirmed stays match the current filters. Try clearing a filter or choose a preferred month and year. Ready Stays have fixed travel dates.
              </p>
            ) : null}
            {appliedDateFilters.dateMode === "flexible" && appliedDateFilters.month ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  No pre-confirmed stays overlap {formatMonth(appliedDateFilters.month)} with the current filters. Choose another preferred month or browse every available month. Each Ready Stay has fixed travel dates.
                </p>
                <Button asChild className="mt-5">
                  <Link href={flexibleBrowseHref} className="!text-white">Browse all available months</Link>
                </Button>
              </>
            ) : null}
            {hasActiveFilters ? (
              <Button asChild className="mt-6">
                <Link href="/ready-stays" className="!text-white">Clear filters</Link>
              </Button>
            ) : null}
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {sortedReadyStays.map((stay) => {
              const resortName = stay.resorts?.name ?? "Resort";
              const resortSlug = stay.resorts?.slug ?? null;
              const resortCode = stay.resorts?.calculator_code ?? null;
              const imageIndex = imageIndexFromId(stay.id);
              const image = resolveResortImage({ resortSlug, resortCode, imageIndex });
              const totalPriceCents = getReadyStayGuestTotalCents(stay);
              const originalTotalPriceCents =
                stay.original_guest_price_per_point_cents &&
                stay.original_guest_price_per_point_cents > stay.guest_price_per_point_cents
                  ? stay.original_guest_price_per_point_cents * stay.points
                  : null;
              const nights = nightsBetween(stay.check_in, stay.check_out);
              const nightlyPriceCents = Math.round(totalPriceCents / Math.max(nights, 1));
              const comparableListings = sortedReadyStays.filter(
                (candidate) => candidate.resort_id === stay.resort_id && candidate.room_type === stay.room_type,
              );
              const similarInventoryCount = comparableListings.length;
              const comparableAverageTotalCents =
                comparableListings.reduce(
                  (sum, candidate) => sum + getReadyStayGuestTotalCents(candidate),
                  0,
                ) / Math.max(similarInventoryCount, 1);
              const lowestComparableTotalCents = Math.min(
                ...comparableListings.map((candidate) => getReadyStayGuestTotalCents(candidate)),
              );
              const signals = resolveReadyStaySignals({
                checkIn: stay.check_in,
                seasonType: stay.season_type,
                similarInventoryCount,
                totalPriceCents,
                comparableAverageTotalCents,
                isLowestPriceComparable: similarInventoryCount > 1 && totalPriceCents === lowestComparableTotalCents,
              });

              return (
                <Card key={stay.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img src={image.url} alt={resortName} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                      {signals.primary ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                          {signals.primary.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-5 p-5">
                    <div>
                      <p className="text-sm font-semibold text-ink">{resortName}</p>
                      <p className="text-xs text-muted">
                        {nights} {nights === 1 ? "Night" : "Nights"}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {formatDate(stay.check_in)} – {formatDate(stay.check_out)}
                        {" • "}
                        Sleeps {estimatedSleeps(stay.room_type)}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {originalTotalPriceCents ? (
                        <p className="text-sm text-slate-400 line-through">{formatCurrencyFromCents(originalTotalPriceCents)}</p>
                      ) : null}
                      <p className="text-3xl font-bold text-slate-900">{formatCurrencyFromCents(totalPriceCents)}</p>
                      <p className="text-sm text-slate-500">{formatCurrencyFromCents(nightlyPriceCents)}/night</p>
                      {originalTotalPriceCents ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Price reduced
                        </span>
                      ) : null}
                    </div>
                    <Button asChild size="sm" className="w-full [&_a]:!text-white">
                      <Link href={`/ready-stays/${stay.id}`} className="!text-white">
                        View Details
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-6 lg:hidden">
          <div className="mx-auto max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Filters</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
            {renderFilters("drawer")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
