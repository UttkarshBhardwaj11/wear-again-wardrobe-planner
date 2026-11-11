import { daysBetween } from "./dates";
import type { CalendarPlan, Garment, Occasion, Outfit, WardrobeState } from "./types";

export function activeGarments(s: WardrobeState): Garment[] {
  return s.garments.filter((g) => !g.deleted_at);
}

export function archivedGarments(s: WardrobeState): Garment[] {
  return s.garments.filter((g) => !!g.deleted_at);
}

export function garmentById(s: WardrobeState, id: string): Garment | undefined {
  return s.garments.find((g) => g.id === id);
}

export function occasionsFor(s: WardrobeState, garmentId: string): Occasion[] {
  return s.garmentOccasions.filter((o) => o.garment_id === garmentId).map((o) => o.occasion);
}

export function outfitById(s: WardrobeState, id: string): Outfit | undefined {
  return s.outfits.find((o) => o.id === id);
}

export function outfitGarmentIds(s: WardrobeState, outfitId: string): string[] {
  return s.outfitGarments.filter((og) => og.outfit_id === outfitId).map((og) => og.garment_id);
}

export function outfitGarments(s: WardrobeState, outfitId: string): Garment[] {
  return outfitGarmentIds(s, outfitId)
    .map((id) => garmentById(s, id))
    .filter((g): g is Garment => !!g);
}

export interface PlanView {
  plan: CalendarPlan;
  outfit: Outfit | undefined;
  garments: Garment[];
}

export function planView(s: WardrobeState, plan: CalendarPlan): PlanView {
  return { plan, outfit: outfitById(s, plan.outfit_id), garments: outfitGarments(s, plan.outfit_id) };
}

export function plansOn(s: WardrobeState, date: string): PlanView[] {
  return s.calendarPlans.filter((p) => p.plan_date === date).map((p) => planView(s, p));
}

/** Every calendar date a garment appears on, ascending. */
export function garmentPlanDates(s: WardrobeState, garmentId: string): { date: string; plan: CalendarPlan }[] {
  const outfitIds = new Set(
    s.outfitGarments.filter((og) => og.garment_id === garmentId).map((og) => og.outfit_id),
  );
  return s.calendarPlans
    .filter((p) => outfitIds.has(p.outfit_id))
    .map((plan) => ({ date: plan.plan_date, plan }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface WearStats {
  wornCount: number;
  lastWorn: string | null;
  nextPlanned: { date: string; event: string } | null;
  outfitCount: number;
}

export function wearStats(s: WardrobeState, garmentId: string, today: string): WearStats {
  const dates = garmentPlanDates(s, garmentId);
  const past = dates.filter((d) => daysBetween(d.date, today) >= 0 && d.date !== today);
  const upcoming = dates.filter((d) => d.date >= today);
  return {
    wornCount: past.length,
    lastWorn: past.length ? past[past.length - 1].date : null,
    nextPlanned: upcoming.length ? { date: upcoming[0].date, event: upcoming[0].plan.event_name } : null,
    outfitCount: new Set(
      s.outfitGarments.filter((og) => og.garment_id === garmentId).map((og) => og.outfit_id),
    ).size,
  };
}

/** Pieces most often paired with a garment across calendar plans (falls back to saved outfits). */
export function wornWith(s: WardrobeState, garmentId: string): { garment: Garment; count: number }[] {
  const counts = new Map<string, number>();
  const outfitIds = s.outfitGarments.filter((og) => og.garment_id === garmentId).map((og) => og.outfit_id);
  for (const outfitId of outfitIds) {
    const uses = Math.max(1, s.calendarPlans.filter((p) => p.outfit_id === outfitId).length);
    for (const id of outfitGarmentIds(s, outfitId)) {
      if (id === garmentId) continue;
      counts.set(id, (counts.get(id) ?? 0) + uses);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ garment: garmentById(s, id), count }))
    .filter((x): x is { garment: Garment; count: number } => !!x.garment && !x.garment.deleted_at)
    .sort((a, b) => b.count - a.count);
}
