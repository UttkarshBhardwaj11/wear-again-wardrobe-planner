export const CATEGORIES = ["TOPS", "BOTTOMS", "FOOTWEAR", "ETHNIC", "OUTERWEAR"] as const;
export type Category = (typeof CATEGORIES)[number];

export const OCCASIONS = ["CASUAL", "FORMAL", "PARTY", "WEDDING"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  TOPS: "Tops",
  BOTTOMS: "Bottoms",
  FOOTWEAR: "Footwear",
  ETHNIC: "Ethnic",
  OUTERWEAR: "Outerwear",
};

export const CATEGORY_SINGULAR: Record<Category, string> = {
  TOPS: "Top",
  BOTTOMS: "Bottom",
  FOOTWEAR: "Shoes",
  ETHNIC: "Ethnic",
  OUTERWEAR: "Layer",
};

export const OCCASION_LABEL: Record<Occasion, string> = {
  CASUAL: "Casual",
  FORMAL: "Formal",
  PARTY: "Party",
  WEDDING: "Wedding",
};

export interface Garment {
  id: string;
  category: Category;
  name: string;
  color: string;
  image_url: string;
  source_url?: string;
  brand?: string;
  created_at: string;
  deleted_at?: string;
}

export interface GarmentOccasion {
  garment_id: string;
  occasion: Occasion;
}

export interface Outfit {
  id: string;
  occasion: Occasion;
  name?: string;
  created_at: string;
}

export interface OutfitGarment {
  outfit_id: string;
  garment_id: string;
}

export interface CalendarPlan {
  id: string;
  outfit_id: string;
  event_name: string;
  /** Local calendar date, YYYY-MM-DD */
  plan_date: string;
}

export interface Profile {
  name: string;
  created_at: string;
}

export interface WardrobeState {
  version: 1;
  profile: Profile | null;
  garments: Garment[];
  garmentOccasions: GarmentOccasion[];
  outfits: Outfit[];
  outfitGarments: OutfitGarment[];
  calendarPlans: CalendarPlan[];
}

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

export function isOccasion(v: unknown): v is Occasion {
  return typeof v === "string" && (OCCASIONS as readonly string[]).includes(v);
}
