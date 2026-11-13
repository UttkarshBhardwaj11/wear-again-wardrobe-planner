import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { fetchWardrobeWith } from "@/lib/wardrobe/fetch";
import { occasionsFor, wearStats } from "@/lib/wardrobe/derive";
import type { Garment, WardrobeState } from "@/lib/wardrobe/types";
import { supabaseForUser } from "./supabase";

export function requireUser(ctx: ToolContext): string {
  const uid = ctx.getUserId();
  if (!ctx.isAuthenticated() || !uid) throw new ToolError("Please connect your Mobidrobe account first.");
  return uid;
}

/** Loads the caller's own wardrobe (RLS-scoped). */
export async function loadCallerWardrobe(ctx: ToolContext): Promise<WardrobeState> {
  const uid = requireUser(ctx);
  try {
    return await fetchWardrobeWith(supabaseForUser(ctx), uid);
  } catch (e) {
    console.error("mcp wardrobe load failed", e);
    throw new ToolError("Couldn't load your wardrobe. Please try again.");
  }
}

/** UTC calendar date; callers can pass their own local date where it matters. */
export function serverToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function garmentJson(s: WardrobeState, g: Garment, today: string) {
  const stats = wearStats(s, g.id, today);
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    color: g.color,
    brand: g.brand ?? null,
    occasions: occasionsFor(s, g.id),
    archived: !!g.deleted_at,
    times_worn: stats.wornCount,
    last_worn: stats.lastWorn,
    next_planned: stats.nextPlanned ? { date: stats.nextPlanned.date, event: stats.nextPlanned.event } : null,
  };
}
