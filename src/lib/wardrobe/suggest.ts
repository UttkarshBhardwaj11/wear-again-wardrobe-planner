import { isNeutral } from "./colors";
import { daysBetween, todayISO } from "./dates";
import { activeGarments, garmentPlanDates, occasionsFor } from "./derive";
import type { Category, Garment, Occasion, WardrobeState } from "./types";

/** A piece counts as "recently worn" if it was worn or planned within this many days before the target date. */
export const RECENT_WINDOW_DAYS = 7;
/** A piece is flagged as "already planned" if it is locked to another date within this many days of the target. */
export const PLANNED_WINDOW_DAYS = 30;
export const PAGE_SIZE = 3;
export const MAX_SUGGESTIONS = 12;

export type FlagKind = "recent" | "planned";

export interface PieceFlag {
  garmentId: string;
  kind: FlagKind;
  date: string;
  event: string;
}

export interface Suggestion {
  key: string;
  title: string;
  occasion: Occasion;
  garmentIds: string[];
  score: number;
  flags: PieceFlag[];
  tags: string[];
}

export interface SuggestInput {
  occasion: Occasion;
  targetDate: string;
  avoidRecent: boolean;
  /** Only return combos that include this garment. */
  anchorId?: string;
  /** Defaults to the real current date. */
  today?: string;
}

export interface SuggestResult {
  suggestions: Suggestion[];
  excludedRecent: number;
  missing: Category[];
}

const TITLES: Record<Occasion, string[]> = {
  FORMAL: ["Tailored Minimalist", "Quiet Authority", "Boardroom Neutrals", "Evening Sharp", "Classic Polish", "Modern Suiting"],
  CASUAL: ["Weekend Ease", "Off-Duty Classic", "Soft Layers", "Linen Days", "Easy Errands", "Slow Sunday"],
  PARTY: ["After Dark", "Satin Hour", "Night Edit", "Cocktail Glow", "Rooftop Ready", "Velvet Rope"],
  WEDDING: ["Festive Heirloom", "Gilded Celebration", "Sangeet Sparkle", "Mehendi Morning", "Royal Revelry", "Golden Hour"],
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * recent: worn or planned 1–7 days before the target date.
 * planned: locked to another upcoming event (today or later) within 30 days of the target.
 */
export function flagsForGarment(
  s: WardrobeState,
  garmentId: string,
  targetDate: string,
  today: string,
): PieceFlag[] {
  const flags: PieceFlag[] = [];
  for (const { date, plan } of garmentPlanDates(s, garmentId)) {
    const before = daysBetween(date, targetDate); // positive = date is before target
    if (before >= 1 && before <= RECENT_WINDOW_DAYS) {
      flags.push({ garmentId, kind: "recent", date, event: plan.event_name });
    } else if (date >= today && Math.abs(before) <= PLANNED_WINDOW_DAYS) {
      flags.push({ garmentId, kind: "planned", date, event: plan.event_name });
    }
  }
  return flags;
}

function harmonyScore(pieces: Garment[]): number {
  const accents = new Set(pieces.filter((p) => !isNeutral(p.color)).map((p) => p.color));
  if (accents.size === 0) return 12;
  if (accents.size === 1) return 18;
  if (accents.size === 2) return 4;
  return -6;
}

export function suggestOutfits(s: WardrobeState, input: SuggestInput): SuggestResult {
  const { occasion, targetDate, avoidRecent, anchorId } = input;
  const today = input.today ?? todayISO();
  const flagMap = new Map<string, PieceFlag[]>();
  let excludedRecent = 0;

  const eligible = activeGarments(s).filter((g) => {
    if (!occasionsFor(s, g.id).includes(occasion)) return false;
    const flags = flagsForGarment(s, g.id, targetDate, today);
    flagMap.set(g.id, flags);
    if (avoidRecent && flags.some((f) => f.kind === "recent") && g.id !== anchorId) {
      excludedRecent++;
      return false;
    }
    return true;
  });

  const by = (c: Category) => eligible.filter((g) => g.category === c);
  const tops = by("TOPS");
  const bottoms = by("BOTTOMS");
  const shoes = by("FOOTWEAR");
  const outers = by("OUTERWEAR");
  const ethnic = by("ETHNIC");

  const bases: Garment[][] = [];
  for (const t of tops) for (const b of bottoms) for (const f of shoes) bases.push([t, b, f]);
  for (const e of ethnic) for (const f of shoes) bases.push([e, f]);

  const missing: Category[] = [];
  if (bases.length === 0) {
    if (!shoes.length) missing.push("FOOTWEAR");
    if (!ethnic.length) {
      if (!tops.length) missing.push("TOPS");
      if (!bottoms.length) missing.push("BOTTOMS");
    }
  }

  const candidates: Suggestion[] = [];
  bases.forEach((base, i) => {
    let pieces = base;
    const isEthnic = base[0].category === "ETHNIC";
    if (!isEthnic && outers.length) {
      // Layer formal looks always; other looks on alternating combos for variety.
      if (occasion === "FORMAL" || i % 2 === 0) {
        const ranked = [...outers].sort(
          (a, b) => harmonyScore([...base, b]) - harmonyScore([...base, a]) || a.id.localeCompare(b.id),
        );
        pieces = [ranked[(i >> 1) % Math.min(ranked.length, 2)], ...base];
      }
    }
    const ids = pieces.map((p) => p.id);
    if (anchorId && !ids.includes(anchorId)) return;

    const flags = ids.flatMap((id) => flagMap.get(id) ?? []);
    const recentPieces = new Set(flags.filter((f) => f.kind === "recent").map((f) => f.garmentId)).size;
    const plannedPieces = new Set(flags.filter((f) => f.kind === "planned").map((f) => f.garmentId)).size;
    const specificity = pieces.filter((p) => occasionsFor(s, p.id).length === 1).length * 2;
    const layerBonus = pieces.some((p) => p.category === "OUTERWEAR") && occasion === "FORMAL" ? 4 : 0;
    const raw = 70 + harmonyScore(pieces) + specificity + layerBonus - recentPieces * 12 - plannedPieces * 6 + (hash(ids.join()) % 5);
    const score = Math.max(52, Math.min(99, raw));

    const tags = [occasion === "FORMAL" ? "Formal / Evening" : occasion === "PARTY" ? "Cocktail & Dinner" : occasion === "WEDDING" ? "Festive" : "Smart Casual"];
    if (pieces.some((p) => p.category === "OUTERWEAR")) tags.push("Warm layer");

    candidates.push({ key: ids.join("-"), title: "", occasion, garmentIds: ids, score, flags, tags });
  });

  candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  // Greedy diversity: prefer combos that share few pieces with those already picked.
  const picked: Suggestion[] = [];
  const pool = [...candidates];
  while (picked.length < MAX_SUGGESTIONS && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((c, idx) => {
      const overlap = picked.reduce(
        (n, p) => n + c.garmentIds.filter((id) => p.garmentIds.includes(id)).length,
        0,
      );
      const val = c.score - overlap * 3;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });
    picked.push(pool.splice(bestIdx, 1)[0]);
  }

  const titles = TITLES[occasion];
  const used = new Set<string>();
  picked.forEach((p) => {
    let t = titles[hash(p.key) % titles.length];
    let n = 0;
    while (used.has(t) && n < titles.length) t = titles[(hash(p.key) + ++n) % titles.length];
    used.add(t);
    p.title = t;
  });

  return { suggestions: picked, excludedRecent, missing };
}
