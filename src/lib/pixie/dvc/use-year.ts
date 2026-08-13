import type { DvcUseYearMonth } from "@/lib/pixie/dvc/types";
import { addCalendarMonths } from "@/lib/pixie/dvc/booking-windows";

const MONTHS: Record<string, DvcUseYearMonth> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function dateParts(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const roundTrip = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  return roundTrip === dateOnly ? { year, month, day } : undefined;
}

function dateOnly(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseUseYearMonth(value?: string | null): DvcUseYearMonth | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return MONTHS[normalized];
}

export function useYearStartForDate(stayDate: string, useYearMonth: DvcUseYearMonth) {
  const parsed = dateParts(stayDate);
  if (!parsed) return undefined;
  const startYear = parsed.month >= useYearMonth ? parsed.year : parsed.year - 1;
  return dateOnly(startYear, useYearMonth, 1);
}

export function useYearEndForDate(stayDate: string, useYearMonth: DvcUseYearMonth) {
  const start = useYearStartForDate(stayDate, useYearMonth);
  const nextStart = start ? addCalendarMonths(start, 12) : undefined;
  if (!nextStart) return undefined;
  const next = dateParts(nextStart);
  if (!next) return undefined;
  const end = new Date(Date.UTC(next.year, next.month - 1, next.day - 1));
  return end.toISOString().slice(0, 10);
}

export function pointExpirationDateForUseYear(stayDate: string, useYearMonth: DvcUseYearMonth) {
  return useYearEndForDate(stayDate, useYearMonth);
}

export function bankingDeadlineForUseYear(stayDate: string, useYearMonth: DvcUseYearMonth) {
  const start = useYearStartForDate(stayDate, useYearMonth);
  return start ? addCalendarMonths(start, 8) : undefined;
}
