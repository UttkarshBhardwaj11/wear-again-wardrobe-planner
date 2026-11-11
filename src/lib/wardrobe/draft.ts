import type { Category, Occasion } from "./types";

/** In-progress garment carried from "Add item" to "Item details". */
export interface GarmentDraft {
  image_url: string;
  source_url?: string;
  name?: string;
  brand?: string;
  color?: string;
  category?: Category;
  occasions: Occasion[];
}

const KEY = "mobidrobe:draft";

export function saveDraft(d: GarmentDraft): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function readDraft(): GarmentDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GarmentDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
