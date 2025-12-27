export function parseISO(input: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${input}`);
  }
  return date;
}

export function formatISO(date: Date, options?: { representation?: 'date' | 'complete' }): string {
  const iso = date.toISOString();
  if (options?.representation === 'date') {
    return iso.split('T')[0];
  }
  return iso;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function differenceInMonths(later: Date, earlier: Date): number {
  return (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth());
}

export function isWithinInterval(date: Date, interval: { start: Date; end: Date }): boolean {
  const time = date.getTime();
  return time >= interval.start.getTime() && time <= interval.end.getTime();
}
