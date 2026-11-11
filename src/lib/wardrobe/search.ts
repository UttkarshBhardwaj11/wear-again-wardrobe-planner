import { isOccasion, type Occasion } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface StyleSearch {
  occasion?: Occasion;
  date?: string;
  q?: string;
  with?: string;
  avoid?: boolean;
  page?: number;
}

/** Shared, forgiving parser for the styling screens' URL params. Every key is optional. */
export function parseStyleSearch(s: Record<string, unknown>): StyleSearch {
  const out: StyleSearch = {};
  if (isOccasion(s.occasion)) out.occasion = s.occasion;
  if (typeof s.date === "string" && ISO.test(s.date)) out.date = s.date;
  if (typeof s.q === "string" && s.q.trim()) out.q = s.q.slice(0, 120);
  if (typeof s.with === "string" && s.with) out.with = s.with;
  if (typeof s.avoid === "boolean") out.avoid = s.avoid;
  if (s.avoid === "false" || s.avoid === "0") out.avoid = false;
  const page = Number(s.page);
  if (Number.isInteger(page) && page > 0 && page < 10) out.page = page;
  return out;
}
