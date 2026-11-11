import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function fromISODate(s: string): Date {
  return parseISO(s);
}

export function shiftISO(s: string, days: number): string {
  return toISODate(addDays(parseISO(s), days));
}

/** b - a in calendar days */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function relativeDayLabel(date: string, today: string = todayISO()): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days ago`;
  return `In ${diff} days`;
}

export function prettyDate(date: string, pattern = "EEE, MMM d"): string {
  return format(parseISO(date), pattern);
}
