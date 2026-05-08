"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  buildTripIntentQuery,
  loadTripIntentFromSession,
  mergeTripIntent,
  parseTripIntentFromSearchParams,
  saveTripIntentToSession,
} from "@/lib/trip-intent";

type ResortOption = {
  id: string;
  name: string;
  slug?: string | null;
};

type OpenPanel = "destination" | "dates" | "guests" | null;

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function isSameDay(a: Date | null, b: Date | null) {
  return Boolean(a && b) && a!.toDateString() === b!.toDateString();
}

function isDateInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const time = date.setHours(0, 0, 0, 0);
  const startTime = new Date(start).setHours(0, 0, 0, 0);
  const endTime = new Date(end).setHours(0, 0, 0, 0);
  return time > startTime && time < endTime;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatDateValue(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatQueryDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diffNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : undefined;
}

function buildMonthGrid(month: Date) {
  const firstDay = startOfMonth(month);
  const startWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function GuestCounter({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  const isAtMin = value <= min;

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[15px] font-medium text-[#0F2148]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={isAtMin}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-200 text-gray-700 transition-all duration-150 hover:bg-gray-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-6 text-center text-[17px] font-semibold text-[#0F2148]">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a70e6] text-white shadow-md transition-all duration-150 hover:brightness-105 hover:shadow-lg active:scale-95"
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function HeroSearchBar({ resorts }: { resorts: ResortOption[] }) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [selectedResort, setSelectedResort] = useState<ResortOption | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adultGuests, setAdultGuests] = useState(1);
  const [childGuests, setChildGuests] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const urlIntent = parseTripIntentFromSearchParams(new URLSearchParams(window.location.search));
    const sessionIntent = loadTripIntentFromSession();
    const initialIntent = mergeTripIntent(sessionIntent, urlIntent);

    if (initialIntent.resort) {
      const matchedResort = resorts.find((resort) => resort.slug === initialIntent.resort);
      if (matchedResort) {
        setSelectedResort(matchedResort);
      }
    }
    if (initialIntent.checkIn) {
      setCheckIn(new Date(`${initialIntent.checkIn}T00:00:00`));
    }
    if (initialIntent.checkOut) {
      setCheckOut(new Date(`${initialIntent.checkOut}T00:00:00`));
    }
    if (typeof initialIntent.adults === "number") {
      setAdultGuests(Math.max(1, initialIntent.adults));
    }
    if (typeof initialIntent.children === "number") {
      setChildGuests(Math.max(0, initialIntent.children));
    }
  }, [resorts]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredResorts = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) return resorts;
    return resorts.filter((resort) => resort.name.toLowerCase().includes(normalized));
  }, [resorts, searchValue]);

  const dateSummary = useMemo(() => {
    if (checkIn && checkOut) return `${formatDateValue(checkIn)} - ${formatDateValue(checkOut)}`;
    if (checkIn) return `${formatDateValue(checkIn)} - Add checkout`;
    return "Add dates";
  }, [checkIn, checkOut]);

  const guestSummary = useMemo(() => {
    const totalGuests = adultGuests + childGuests;
    return `${totalGuests} guest${totalGuests === 1 ? "" : "s"}`;
  }, [adultGuests, childGuests]);

  const destinationSummary = selectedResort?.name ?? "Choose resort";

  const planHref = useMemo(() => {
    const params = buildTripIntentQuery({
      resort: selectedResort?.slug ?? undefined,
      checkIn: checkIn ? formatQueryDate(checkIn) : undefined,
      checkOut: checkOut ? formatQueryDate(checkOut) : undefined,
      nights: checkIn && checkOut ? diffNights(formatQueryDate(checkIn), formatQueryDate(checkOut)) : undefined,
      adults: adultGuests,
      children: childGuests,
    });
    const query = params.toString();
    return query ? `/plan?${query}` : "/plan";
  }, [selectedResort, checkIn, checkOut, adultGuests, childGuests]);

  useEffect(() => {
    saveTripIntentToSession({
      resort: selectedResort?.slug ?? undefined,
      checkIn: checkIn ? formatQueryDate(checkIn) : undefined,
      checkOut: checkOut ? formatQueryDate(checkOut) : undefined,
      nights: checkIn && checkOut ? diffNights(formatQueryDate(checkIn), formatQueryDate(checkOut)) : undefined,
      adults: adultGuests,
      children: childGuests,
    });
  }, [selectedResort, checkIn, checkOut, adultGuests, childGuests]);

  function handleDateSelect(day: Date) {
    const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(normalizedDay);
      setCheckOut(null);
      return;
    }

    if (normalizedDay < checkIn) {
      setCheckIn(normalizedDay);
      return;
    }

    setCheckOut(normalizedDay);
  }

  return (
    <div ref={containerRef} className="mt-4 max-w-[780px]">
      <div className="flex flex-col overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.045] shadow-[0_8px_18px_rgba(8,13,32,0.14)] backdrop-blur-md lg:flex-row lg:items-stretch">
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === "destination" ? null : "destination")}
          className="flex min-w-0 flex-1 items-center gap-4 border-b border-white/[0.07] px-6 py-3.5 text-left transition hover:bg-white/[0.03] lg:border-b-0 lg:border-r lg:border-white/[0.07]"
        >
          <MapPin className="h-4 w-4 shrink-0 text-white/60" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">{destinationSummary}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === "dates" ? null : "dates")}
          className="flex min-w-0 flex-1 items-center gap-4 border-b border-white/[0.07] px-6 py-3.5 text-left transition hover:bg-white/[0.03] lg:border-b-0 lg:border-r lg:border-white/[0.07]"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-white/60" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/90">{dateSummary}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === "guests" ? null : "guests")}
          className="flex min-w-0 flex-1 items-center gap-4 px-6 py-3.5 text-left transition hover:bg-white/[0.03] lg:border-r lg:border-white/[0.07]"
        >
          <Users className="h-4 w-4 shrink-0 text-white/60" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/90">{guestSummary}</p>
          </div>
        </button>

        <div className="lg:min-w-[190px]">
          <Link
            href={planHref}
            className="flex h-full min-h-[58px] w-full items-center justify-center gap-2.5 rounded-none border-0 bg-[linear-gradient(135deg,#4368de_0%,#3256cd_54%,#2743b2_100%)] px-7 py-3 text-[17px] font-semibold !text-white shadow-none transition duration-200 hover:brightness-110 hover:!text-white"
          >
            <Search className="h-4 w-4" />
            <span>Find Your Stay</span>
          </Link>
        </div>
      </div>

      {openPanel === "destination" ? (
        <div className="mt-3 max-w-[420px] overflow-hidden rounded-[24px] border border-white/12 bg-white shadow-[0_18px_44px_rgba(15,33,72,0.18)]">
          <div className="border-b border-[#0F2148]/8 px-4 py-4">
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search resorts"
              className="w-full rounded-xl border border-[#0F2148]/10 bg-[#f7f9fc] px-4 py-3 text-sm text-[#0F2148] outline-none placeholder:text-[#6f7683]"
            />
          </div>
          <div className="max-h-[320px] overflow-auto p-2">
            {filteredResorts.map((resort) => (
              <button
                key={resort.id}
                type="button"
                onClick={() => {
                  setSelectedResort(resort);
                  setOpenPanel(null);
                  setSearchValue("");
                }}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-[#0F2148] transition hover:bg-[#f7f9fc]"
              >
                <span>{resort.name}</span>
                {selectedResort?.id === resort.id ? <span className="text-[#5b78ff]">Selected</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {openPanel === "dates" ? (
        <div className="mt-3 max-w-[760px] overflow-hidden rounded-[24px] border border-white/12 bg-white shadow-[0_18px_44px_rgba(15,33,72,0.18)]">
          <div className="flex items-center justify-between border-b border-[#0F2148]/8 px-5 py-4">
            <button
              type="button"
              onClick={() => setMonthCursor((current) => addMonths(current, -1))}
              className="rounded-full p-2 text-[#0F2148] transition hover:bg-[#f4f6fb]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonthCursor((current) => addMonths(current, 1))}
              className="rounded-full p-2 text-[#0F2148] transition hover:bg-[#f4f6fb]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            {[monthCursor, addMonths(monthCursor, 1)].map((month) => {
              const days = buildMonthGrid(month);

              return (
                <div key={month.toISOString()} className="border-r border-[#0F2148]/8 last:border-r-0">
                  <div className="px-5 py-4 text-center text-[1.15rem] font-semibold text-[#0F2148]">
                    {formatMonthLabel(month)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-2 px-4 pb-4">
                    {WEEKDAY_LABELS.map((label) => (
                      <div key={`${month.toISOString()}-${label}`} className="pb-1 text-center text-sm font-semibold text-[#0F2148]/72">
                        {label}
                      </div>
                    ))}
                    {days.map((day) => {
                      const isCurrentMonth = day.getMonth() === month.getMonth();
                      const isSelectedStart = isSameDay(day, checkIn);
                      const isSelectedEnd = isSameDay(day, checkOut);
                      const isBetween = isDateInRange(new Date(day), checkIn, checkOut);
                      return (
                        <button
                          key={`${month.toISOString()}-${day.toISOString()}`}
                          type="button"
                          onClick={() => handleDateSelect(day)}
                          className={[
                            "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-base transition",
                            isSelectedStart || isSelectedEnd
                              ? "bg-[#4a70e6] font-semibold text-white"
                              : isBetween
                                ? "bg-[#dbe6ff] text-[#0F2148]"
                                : isCurrentMonth
                                  ? "text-[#0F2148] hover:bg-[#f4f6fb]"
                                  : "text-[#0F2148]/35",
                          ].join(" ")}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {openPanel === "guests" ? (
        <div className="mt-3 max-w-[420px] overflow-hidden rounded-[24px] border border-white/12 bg-white shadow-[0_18px_44px_rgba(15,33,72,0.18)]">
          <div className="space-y-5 px-5 py-5">
            <GuestCounter label="Adult Guests" value={adultGuests} min={1} onChange={(next) => setAdultGuests(Math.max(1, next))} />
            <GuestCounter label="Child Guests" value={childGuests} min={0} onChange={setChildGuests} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
