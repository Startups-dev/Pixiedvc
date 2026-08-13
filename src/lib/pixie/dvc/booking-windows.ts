import type { DvcBookingWindowStatus } from "@/lib/pixie/dvc/types";

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value ? { year, month, day } : undefined;
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDateOnly(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function addCalendarMonths(dateOnly: string, months: number) {
  const parsed = parseDateOnly(dateOnly);
  if (!parsed) return undefined;
  const monthIndex = parsed.month - 1 + months;
  const targetYear = parsed.year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;
  const targetDay = Math.min(parsed.day, lastDayOfMonth(targetYear, targetMonth));
  return formatDateOnly(targetYear, targetMonth, targetDay);
}

export function compareDateOnly(a: string, b: string) {
  return a.localeCompare(b);
}

export function homeResortBookingOpenDate(checkInDate: string) {
  return addCalendarMonths(checkInDate, -11);
}

export function nonHomeResortBookingOpenDate(checkInDate: string) {
  return addCalendarMonths(checkInDate, -7);
}

export function evaluateDvcBookingWindow(params: {
  checkInDate: string;
  asOfDate: string;
  isHomeResort?: boolean;
}): {
  status: DvcBookingWindowStatus;
  homeOpenDate: string;
  nonHomeOpenDate: string;
  applicableOpenDate: string;
} | undefined {
  const homeOpenDate = homeResortBookingOpenDate(params.checkInDate);
  const nonHomeOpenDate = nonHomeResortBookingOpenDate(params.checkInDate);
  if (!homeOpenDate || !nonHomeOpenDate) return undefined;
  const applicableOpenDate = params.isHomeResort ? homeOpenDate : nonHomeOpenDate;
  if (compareDateOnly(params.asOfDate, applicableOpenDate) < 0) {
    return { status: "not_open", homeOpenDate, nonHomeOpenDate, applicableOpenDate };
  }
  if (compareDateOnly(params.asOfDate, nonHomeOpenDate) >= 0) {
    return { status: "seven_month_window", homeOpenDate, nonHomeOpenDate, applicableOpenDate };
  }
  return {
    status: params.isHomeResort ? "home_resort_window" : "not_open",
    homeOpenDate,
    nonHomeOpenDate,
    applicableOpenDate,
  };
}
