import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "./dates";
import { fetchWardrobeWith } from "./fetch";
import { isStorageRef, removePhoto, uploadPhoto } from "./photo-store";
import { emptyState } from "./seed";
import type { CalendarPlan, Category, Garment, Occasion, WardrobeState } from "./types";

/**
 * The signed-in user's wardrobe, mirrored in memory from the database.
 * Reads are synchronous (useWardrobe); writes update memory first, then save in order.
 * If a save fails, the wardrobe is reloaded from the database so the screen never lies.
 */

const SERVER_SNAPSHOT: WardrobeState = emptyState();
let current: WardrobeState = emptyState();
let userId: string | null = null;
let loadingFor: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setLocal(updater: (s: WardrobeState) => WardrobeState) {
  current = updater(current);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getState(): WardrobeState {
  return current;
}

export function useWardrobe(): WardrobeState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_SNAPSHOT);
}

// ---------- loading ----------

async function fetchWardrobe(uid: string): Promise<WardrobeState> {
  return fetchWardrobeWith(supabase, uid);
}

/** Loads the wardrobe for this user once; pass force to refetch. */
export function loadWardrobe(uid: string, force = false): Promise<void> {
  if (!force && userId === uid && !loading) return Promise.resolve();
  if (!force && loading && loadingFor === uid) return loading;
  loadingFor = uid;
  const run: Promise<void> = fetchWardrobe(uid)
    .then((next) => {
      if (loadingFor !== uid) return; // signed out or switched accounts meanwhile
      userId = uid;
      current = next;
      emit();
    })
    .finally(() => {
      if (loading === run) loading = null;
    });
  loading = run;
  return run;
}

/** Forget everything in memory (used on sign-out). */
export function resetWardrobe() {
  userId = null;
  loadingFor = null;
  loading = null;
  current = emptyState();
  emit();
}

// ---------- saving ----------

let queue: Promise<void> = Promise.resolve();

function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

function requireUser(): string {
  if (!userId) throw new Error("Please sign in again.");
  return userId;
}

/** Runs saves one after another; on failure tells the user and reloads the real data. */
function persist(what: string, op: () => Promise<void>): Promise<void> {
  const uid = userId;
  const run = queue.then(op);
  queue = run.catch(async (e: unknown) => {
    console.error(e);
    toast.error(`Couldn't save ${what}`, { description: "Check your connection and try again." });
    if (uid && uid === userId) await loadWardrobe(uid, true).catch(() => {});
  });
  return run;
}

async function photoRef(uid: string, image: string): Promise<string> {
  return image.startsWith("data:") ? uploadPhoto(uid, image) : image;
}

// ---------- actions ----------

export function completeOnboarding(name: string) {
  const uid = requireUser();
  const at = new Date().toISOString();
  const clean = name.trim();
  setLocal((s) => ({ ...s, profile: { name: clean, created_at: at } }));
  void persist("your name", async () => {
    check(await supabase.from("profiles").upsert({ id: uid, name: clean, onboarded_at: at }));
  });
}

export function renameProfile(name: string) {
  const uid = requireUser();
  const clean = name.trim();
  const at = current.profile?.created_at ?? new Date().toISOString();
  setLocal((s) => ({ ...s, profile: { name: clean, created_at: at } }));
  void persist("your name", async () => {
    check(await supabase.from("profiles").upsert({ id: uid, name: clean, onboarded_at: at }));
  });
}

export async function resetToSample() {
  const uid = requireUser();
  await queue;
  check(await supabase.rpc("restore_sample_wardrobe", { _today: todayISO() }));
  await loadWardrobe(uid, true);
}

export async function clearWardrobe() {
  const uid = requireUser();
  await queue;
  check(await supabase.rpc("clear_my_wardrobe"));
  await loadWardrobe(uid, true);
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
  const uid = requireUser();
  const id = crypto.randomUUID();
  const { occasions, ...rest } = input;
  const garment: Garment = { id, ...rest, created_at: new Date().toISOString() };
  setLocal((s) => ({
    ...s,
    garments: [garment, ...s.garments],
    garmentOccasions: [...s.garmentOccasions, ...occasions.map((occasion) => ({ garment_id: id, occasion }))],
  }));
  void persist(input.name, async () => {
    const image_url = await photoRef(uid, rest.image_url);
    check(
      await supabase.from("garments").insert({
        id,
        category: rest.category,
        name: rest.name,
        color: rest.color,
        image_url,
        source_url: rest.source_url ?? null,
        brand: rest.brand ?? null,
        created_at: garment.created_at,
      }),
    );
    if (occasions.length) {
      check(await supabase.from("garment_occasions").insert(occasions.map((occasion) => ({ garment_id: id, occasion }))));
    }
    if (image_url !== rest.image_url) {
      setLocal((s) => ({ ...s, garments: s.garments.map((g) => (g.id === id ? { ...g, image_url } : g)) }));
    }
  });
  return id;
}

export function updateGarment(id: string, input: GarmentInput) {
  const uid = requireUser();
  const { occasions, ...rest } = input;
  const previousImage = current.garments.find((g) => g.id === id)?.image_url;
  setLocal((s) => ({
    ...s,
    garments: s.garments.map((g) => {
      if (g.id !== id) return g;
      const next: Garment = { ...g, ...rest };
      if (!rest.brand) delete next.brand;
      if (!rest.source_url) delete next.source_url;
      return next;
    }),
    garmentOccasions: [
      ...s.garmentOccasions.filter((o) => o.garment_id !== id),
      ...occasions.map((occasion) => ({ garment_id: id, occasion })),
    ],
  }));
  void persist(input.name, async () => {
    const image_url = await photoRef(uid, rest.image_url);
    check(
      await supabase
        .from("garments")
        .update({
          category: rest.category,
          name: rest.name,
          color: rest.color,
          image_url,
          source_url: rest.source_url ?? null,
          brand: rest.brand ?? null,
        })
        .eq("id", id),
    );
    check(await supabase.from("garment_occasions").delete().eq("garment_id", id));
    if (occasions.length) {
      check(await supabase.from("garment_occasions").insert(occasions.map((occasion) => ({ garment_id: id, occasion }))));
    }
    if (image_url !== rest.image_url) {
      setLocal((s) => ({ ...s, garments: s.garments.map((g) => (g.id === id ? { ...g, image_url } : g)) }));
    }
    if (previousImage && previousImage !== image_url && isStorageRef(previousImage)) {
      await removePhoto(previousImage).catch(() => {});
    }
  });
}

export function archiveGarment(id: string) {
  const at = new Date().toISOString();
  setLocal((s) => ({ ...s, garments: s.garments.map((g) => (g.id === id ? { ...g, deleted_at: at } : g)) }));
  void persist("that change", async () => {
    check(await supabase.from("garments").update({ deleted_at: at }).eq("id", id));
  });
}

export function restoreGarment(id: string) {
  setLocal((s) => ({
    ...s,
    garments: s.garments.map((g) => {
      if (g.id !== id) return g;
      const { deleted_at: _removed, ...rest } = g;
      return rest;
    }),
  }));
  void persist("that change", async () => {
    check(await supabase.from("garments").update({ deleted_at: null }).eq("id", id));
  });
}

export interface LockInput {
  occasion: Occasion;
  name?: string;
  garmentIds: string[];
  event_name: string;
  plan_date: string;
}

export function lockOutfit(input: LockInput): { outfitId: string; planId: string } {
  requireUser();
  const outfitId = crypto.randomUUID();
  const planId = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const event_name = input.event_name.trim();
  setLocal((s) => ({
    ...s,
    outfits: [...s.outfits, { id: outfitId, occasion: input.occasion, name: input.name, created_at }],
    outfitGarments: [...s.outfitGarments, ...input.garmentIds.map((garment_id) => ({ outfit_id: outfitId, garment_id }))],
    calendarPlans: [...s.calendarPlans, { id: planId, outfit_id: outfitId, event_name, plan_date: input.plan_date }],
  }));
  void persist("this plan", async () => {
    check(
      await supabase
        .from("outfits")
        .insert({ id: outfitId, occasion: input.occasion, name: input.name ?? null, created_at }),
    );
    check(
      await supabase
        .from("outfit_garments")
        .insert(input.garmentIds.map((garment_id) => ({ outfit_id: outfitId, garment_id }))),
    );
    check(
      await supabase
        .from("calendar_plans")
        .insert({ id: planId, outfit_id: outfitId, event_name, plan_date: input.plan_date }),
    );
  });
  return { outfitId, planId };
}

export function updatePlan(id: string, patch: { event_name: string; plan_date: string }) {
  const event_name = patch.event_name.trim();
  setLocal((s) => ({
    ...s,
    calendarPlans: s.calendarPlans.map((p) => (p.id === id ? { ...p, event_name, plan_date: patch.plan_date } : p)),
  }));
  void persist("this plan", async () => {
    check(await supabase.from("calendar_plans").update({ event_name, plan_date: patch.plan_date }).eq("id", id));
  });
}

export function removePlan(id: string) {
  setLocal((s) => ({ ...s, calendarPlans: s.calendarPlans.filter((p) => p.id !== id) }));
  void persist("that change", async () => {
    check(await supabase.from("calendar_plans").delete().eq("id", id));
  });
}

export function restorePlan(plan: CalendarPlan) {
  setLocal((s) => ({ ...s, calendarPlans: [...s.calendarPlans, plan] }));
  void persist("this plan", async () => {
    check(
      await supabase
        .from("calendar_plans")
        .insert({ id: plan.id, outfit_id: plan.outfit_id, event_name: plan.event_name, plan_date: plan.plan_date }),
    );
  });
}
