function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function formatISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addMonths(dateISO: string, months: number) {
  const date = parseISODate(dateISO);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatISODate(date);
}

export function lastDayOfMonth(dateISO: string) {
  const date = parseISODate(dateISO);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return formatISODate(lastDay);
}

export function getBankingDeadline(useYearStartISO: string) {
  const monthSeven = addMonths(useYearStartISO, 7);
  return lastDayOfMonth(monthSeven);
}

export function daysUntil(dateISO: string) {
  const target = parseISODate(dateISO).getTime();
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target - todayUTC) / (1000 * 60 * 60 * 24));
}

export function getUseYearEndFromStart(useYearStartISO: string) {
  const start = parseISODate(useYearStartISO);
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate() - 1));
  return formatISODate(end);
}
