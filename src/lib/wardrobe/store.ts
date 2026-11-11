import { useSyncExternalStore } from "react";
import { buildSeed, emptyState } from "./seed";
import type { Category, Garment, Occasion, WardrobeState } from "./types";

const STORAGE_KEY = "mobidrobe:v1";

let current: WardrobeState | null = null;
let serverSnapshot: WardrobeState | null = null;
const listeners = new Set<() => void>();

function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rand}`;
}

function isValidState(v: unknown): v is WardrobeState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<WardrobeState>;
  return (
    s.version === 1 &&
    Array.isArray(s.garments) &&
    Array.isArray(s.garmentOccasions) &&
    Array.isArray(s.outfits) &&
    Array.isArray(s.outfitGarments) &&
    Array.isArray(s.calendarPlans)
  );
}

function load(): WardrobeState {
  if (typeof window === "undefined") return getServerSnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
    }
  } catch {
    // fall through to a fresh sample wardrobe
  }
  const seeded = buildSeed(new Date());
  persist(seeded);
  return seeded;
}

function persist(s: WardrobeState): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function getState(): WardrobeState {
  if (!current) current = load();
  return current;
}

function getServerSnapshot(): WardrobeState {
  if (!serverSnapshot) serverSnapshot = buildSeed(new Date());
  return serverSnapshot;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      current = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns false when the device ran out of storage space. */
function setState(updater: (s: WardrobeState) => WardrobeState): boolean {
  const next = updater(getState());
  const ok = persist(next);
  if (!ok) return false;
  current = next;
  listeners.forEach((l) => l());
  return true;
}

export function useWardrobe(): WardrobeState {
  return useSyncExternalStore(subscribe, getState, getServerSnapshot);
}

export class StorageFullError extends Error {
  constructor() {
    super("This device is out of space for new photos. Try a smaller photo or archive a few items.");
  }
}

function commit(updater: (s: WardrobeState) => WardrobeState) {
  if (!setState(updater)) throw new StorageFullError();
}

// ---------- actions ----------

export function completeOnboarding(name: string) {
  commit((s) => ({ ...s, profile: { name: name.trim(), created_at: new Date().toISOString() } }));
}

export function renameProfile(name: string) {
  commit((s) => ({
    ...s,
    profile: { name: name.trim(), created_at: s.profile?.created_at ?? new Date().toISOString() },
  }));
}

export function resetToSample() {
  commit((s) => ({ ...buildSeed(new Date()), profile: s.profile }));
}

export function clearWardrobe() {
  commit((s) => emptyState(s.profile));
}

export interface GarmentInput {
  category: Category;
  name: string;
  color: string;
  image_url: string;
  source_url?: string;
  brand?: string;
  occasions: Occasion[];
}

export function addGarment(input: GarmentInput): string {
  const id = uid("g");
  const { occasions, ...rest } = input;
  const garment: Garment = { id, ...rest, created_at: new Date().toISOString() };
  commit((s) => ({
    ...s,
    garments: [garment, ...s.garments],
    garmentOccasions: [
      ...s.garmentOccasions,
      ...occasions.map((occasion) => ({ garment_id: id, occasion })),
    ],
  }));
  return id;
}

export function updateGarment(id: string, input: GarmentInput) {
  const { occasions, ...rest } = input;
  commit((s) => ({
    ...s,
    garments: s.garments.map((g) => (g.id === id ? { ...g, ...rest } : g)),
    garmentOccasions: [
      ...s.garmentOccasions.filter((o) => o.garment_id !== id),
      ...occasions.map((occasion) => ({ garment_id: id, occasion })),
    ],
  }));
}

export function archiveGarment(id: string) {
  const at = new Date().toISOString();
  commit((s) => ({
    ...s,
    garments: s.garments.map((g) => (g.id === id ? { ...g, deleted_at: at } : g)),
  }));
}

export function restoreGarment(id: string) {
  commit((s) => ({
    ...s,
    garments: s.garments.map((g) => {
      if (g.id !== id) return g;
      const { deleted_at: _removed, ...rest } = g;
      return rest;
    }),
  }));
}

export interface LockInput {
  occasion: Occasion;
  name?: string;
  garmentIds: string[];
  event_name: string;
  plan_date: string;
}

export function lockOutfit(input: LockInput): { outfitId: string; planId: string } {
  const outfitId = uid("o");
  const planId = uid("p");
  commit((s) => ({
    ...s,
    outfits: [...s.outfits, { id: outfitId, occasion: input.occasion, name: input.name, created_at: new Date().toISOString() }],
    outfitGarments: [
      ...s.outfitGarments,
      ...input.garmentIds.map((garment_id) => ({ outfit_id: outfitId, garment_id })),
    ],
    calendarPlans: [
      ...s.calendarPlans,
      { id: planId, outfit_id: outfitId, event_name: input.event_name.trim(), plan_date: input.plan_date },
    ],
  }));
  return { outfitId, planId };
}

export function updatePlan(id: string, patch: { event_name: string; plan_date: string }) {
  commit((s) => ({
    ...s,
    calendarPlans: s.calendarPlans.map((p) =>
      p.id === id ? { ...p, event_name: patch.event_name.trim(), plan_date: patch.plan_date } : p,
    ),
  }));
}

export function removePlan(id: string) {
  commit((s) => ({ ...s, calendarPlans: s.calendarPlans.filter((p) => p.id !== id) }));
}

export function restorePlan(plan: WardrobeState["calendarPlans"][number]) {
  commit((s) => ({ ...s, calendarPlans: [...s.calendarPlans, plan] }));
}
