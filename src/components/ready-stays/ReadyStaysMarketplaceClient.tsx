"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import { resolveResortImage } from "@/lib/resort-image";

type ReadyStayRow = {
  id: string;
  resort_id: string;
  check_in: string;
  check_out: string;
  points: number;
  room_type: string;
  season_type: string;
  guest_price_per_point_cents: number;
  resorts?: {
    name?: string | null;
    slug?: string | null;
    calculator_code?: string | null;
  } | null;
};

type ResortOption = {
  id: string;
  name: string;
};

type SearchParams = {
  resort?: string;
  month?: string;
  holiday?: string;
  price_min?: string;
  price_max?: string;
  points_min?: string;
  points_max?: string;
  sort?: string;
};

const HOLIDAY_TAGS = [
  { value: "christmas", label: "Christmas" },
  { value: "halloween", label: "Halloween" },
  { value: "marathon", label: "Marathon" },
  { value: "spring_break", label: "Spring Break" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function imageIndexFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 5;
  }
  return (hash % 5) + 1;
}

function holidayLabel(seasonType: string | null) {
  switch (seasonType) {
    case "christmas":
      return "Christmas";
    case "halloween":
      return "Halloween";
    case "marathon":
      return "Marathon";
    case "spring_break":
      return "Spring Break";
    default:
      return null;
  }
}

function daysUntil(dateValue: string) {
  const now = new Date();
  const target = new Date(dateValue);
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
        const holidayDelta = holidayPriority(b.season_type) - holidayPriority(a.season_type);
        if (holidayDelta !== 0) return holidayDelta;
        const totalA = a.guest_price_per_point_cents * a.points;
        const totalB = b.guest_price_per_point_cents * b.points;
        return totalB - totalA;
      });
    case "price_asc":
      return sorted.sort((a, b) => a.guest_price_per_point_cents - b.guest_price_per_point_cents);
    case "price_desc":
      return sorted.sort((a, b) => b.guest_price_per_point_cents - a.guest_price_per_point_cents);
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

  const sortedReadyStays = useMemo(() => sortReadyStays(readyStays, sort), [readyStays, sort]);

  const hasActiveFilters = Boolean(
    searchParams.resort ||
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

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Resort</span>
          <input
            list={`ready-stays-resorts-${variant}`}
            value={resortQuery}
            onChange={(event) => handleResortChange(event.target.value)}
            placeholder="Search resort"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <datalist id={`ready-stays-resorts-${variant}`}>
            {resorts.map((resort) => (
              <option key={resort.id} value={resort.name} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Month</span>
          <input
            name="month"
            type="month"
            defaultValue={searchParams.month ?? ""}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Holiday</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {HOLIDAY_TAGS.map((tag) => (
              <label key={tag.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="holiday"
                  value={tag.value}
                  defaultChecked={searchParams.holiday === tag.value}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition peer-checked:border-[#0F2148] peer-checked:bg-[#0F2148]/10 peer-checked:text-[#0F2148]">
                  {tag.label}
                </span>
              </label>
            ))}
            <label className="cursor-pointer">
              <input
                type="radio"
                name="holiday"
                value=""
                defaultChecked={!searchParams.holiday}
                className="peer sr-only"
              />
              <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition peer-checked:border-[#0F2148] peer-checked:bg-[#0F2148]/10 peer-checked:text-[#0F2148]">
                Any
              </span>
            </label>
          </div>
        </div>

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
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">{renderFilters("sidebar")}</div>
      </aside>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">
              {sortedReadyStays.length} Ready Stays available
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 lg:hidden"
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
            <p className="text-lg font-semibold text-ink">No Ready Stays match your filters</p>
            <p className="mt-2 text-sm text-muted">
              Try clearing filters or selecting a different month.
            </p>
            <Button asChild className="mt-6">
              <Link href="/ready-stays">Clear filters</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {sortedReadyStays.map((stay) => {
              const resortName = stay.resorts?.name ?? "Resort";
              const resortSlug = stay.resorts?.slug ?? null;
              const resortCode = stay.resorts?.calculator_code ?? null;
              const imageIndex = imageIndexFromId(stay.id);
              const image = resolveResortImage({ resortSlug, resortCode, imageIndex });
              const totalPriceCents = stay.guest_price_per_point_cents * stay.points;
              const badge = holidayLabel(stay.season_type);
              const daysToCheckIn = daysUntil(stay.check_in);
              const urgencyBadge =
                typeof daysToCheckIn === "number" && daysToCheckIn <= 30
                  ? "Last-Minute Stay"
                  : typeof daysToCheckIn === "number" && daysToCheckIn <= 60
                    ? "Check-in Soon"
                    : null;

              return (
                <Card key={stay.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-44 w-full overflow-hidden">
                    <img src={image.url} alt={resortName} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                      {badge ? (
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                          {badge}
                        </span>
                      ) : null}
                      {urgencyBadge ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {urgencyBadge}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                        Only 1 available
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <p className="text-sm font-semibold text-ink">{resortName}</p>
                      <p className="text-xs text-muted">
                        {formatDate(stay.check_in)} – {formatDate(stay.check_out)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-muted">Points</p>
                        <p className="text-sm font-semibold text-ink">{stay.points}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em] text-muted">$/pt</p>
                        <p className="text-sm font-semibold text-ink">
                          {formatCurrencyFromCents(stay.guest_price_per_point_cents)}
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.2em] text-muted">Total</p>
                        <p className="text-sm font-semibold text-ink">
                          {formatCurrencyFromCents(totalPriceCents)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Confirmed Disney reservation • Secure transfer
                    </p>
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/ready-stays/${stay.id}`}>View stay</Link>
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
