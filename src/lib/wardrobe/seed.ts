import { shiftISO, toISODate } from "./dates";
import type { Category, Occasion, WardrobeState } from "./types";

type SeedGarment = {
  id: string;
  category: Category;
  name: string;
  color: string;
  image: string;
  brand?: string;
  occasions: Occasion[];
  addedDaysAgo: number;
};

const GARMENTS: SeedGarment[] = [
  { id: "g01", category: "OUTERWEAR", name: "Structured Camel Coat", color: "Camel", image: "camel-coat", brand: "Studio Nicholson", occasions: ["FORMAL", "CASUAL"], addedDaysAgo: 90 },
  { id: "g02", category: "OUTERWEAR", name: "Cream Belted Trench", color: "Cream", image: "cream-trench", brand: "Arket", occasions: ["CASUAL", "FORMAL"], addedDaysAgo: 84 },
  { id: "g03", category: "OUTERWEAR", name: "Tailored Black Blazer", color: "Black", image: "black-blazer", brand: "Massimo Dutti", occasions: ["FORMAL", "PARTY"], addedDaysAgo: 80 },
  { id: "g04", category: "TOPS", name: "Poplin Button-Down", color: "White", image: "white-poplin-shirt", brand: "COS", occasions: ["FORMAL", "CASUAL"], addedDaysAgo: 78 },
  { id: "g05", category: "TOPS", name: "Merino Turtleneck", color: "Black", image: "black-turtleneck", brand: "Uniqlo", occasions: ["FORMAL", "CASUAL", "PARTY"], addedDaysAgo: 75 },
  { id: "g06", category: "TOPS", name: "Cable Knit Sweater", color: "Cream", image: "cream-cable-knit", brand: "Arket", occasions: ["CASUAL"], addedDaysAgo: 70 },
  { id: "g07", category: "TOPS", name: "Silk Slip Camisole", color: "Terracotta", image: "terracotta-silk-cami", brand: "Reformation", occasions: ["PARTY", "CASUAL"], addedDaysAgo: 66 },
  { id: "g08", category: "TOPS", name: "Breton Stripe Tee", color: "Navy", image: "breton-tee", brand: "Saint James", occasions: ["CASUAL"], addedDaysAgo: 62 },
  { id: "g22", category: "TOPS", name: "Silk Bow Blouse", color: "Ivory", image: "ivory-silk-blouse", brand: "& Other Stories", occasions: ["FORMAL", "PARTY"], addedDaysAgo: 20 },
  { id: "g09", category: "BOTTOMS", name: "Pleated Wool Trousers", color: "Charcoal", image: "charcoal-trousers", brand: "The Row", occasions: ["FORMAL"], addedDaysAgo: 88 },
  { id: "g10", category: "BOTTOMS", name: "Straight Ecru Denim", color: "Ecru", image: "ecru-denim", brand: "Agolde", occasions: ["CASUAL"], addedDaysAgo: 72 },
  { id: "g11", category: "BOTTOMS", name: "Indigo Straight Jeans", color: "Indigo", image: "indigo-jeans", brand: "Levi's", occasions: ["CASUAL", "PARTY"], addedDaysAgo: 68 },
  { id: "g12", category: "BOTTOMS", name: "Wide-Leg Trousers", color: "Chocolate", image: "chocolate-wide-leg", brand: "Totême", occasions: ["FORMAL", "PARTY"], addedDaysAgo: 40 },
  { id: "g13", category: "BOTTOMS", name: "Satin Midi Skirt", color: "Black", image: "black-satin-skirt", brand: "Zara", occasions: ["PARTY", "FORMAL"], addedDaysAgo: 36 },
  { id: "g14", category: "FOOTWEAR", name: "Leather Chelsea Boots", color: "Tan", image: "tan-chelsea-boots", brand: "Grenson", occasions: ["CASUAL", "FORMAL"], addedDaysAgo: 86 },
  { id: "g15", category: "FOOTWEAR", name: "Heeled Ankle Boots", color: "Black", image: "black-ankle-boots", brand: "Aeyde", occasions: ["FORMAL", "PARTY"], addedDaysAgo: 60 },
  { id: "g16", category: "FOOTWEAR", name: "Leather Court Sneakers", color: "White", image: "white-sneakers", brand: "Veja", occasions: ["CASUAL"], addedDaysAgo: 82 },
  { id: "g23", category: "FOOTWEAR", name: "Penny Loafers", color: "Black", image: "black-loafers", brand: "G.H. Bass", occasions: ["FORMAL", "CASUAL"], addedDaysAgo: 30 },
  { id: "g17", category: "FOOTWEAR", name: "Zari Embroidered Juttis", color: "Gold", image: "gold-juttis", brand: "Fizzy Goblet", occasions: ["WEDDING", "PARTY", "CASUAL"], addedDaysAgo: 50 },
  { id: "g18", category: "ETHNIC", name: "Block-Print Cotton Kurta", color: "Rust", image: "rust-kurta", brand: "Fabindia", occasions: ["CASUAL", "WEDDING"], addedDaysAgo: 58 },
  { id: "g19", category: "ETHNIC", name: "Emerald Silk Lehenga", color: "Emerald", image: "emerald-lehenga", brand: "Anita Dongre", occasions: ["WEDDING"], addedDaysAgo: 25 },
  { id: "g20", category: "ETHNIC", name: "Chikankari Kurta Set", color: "Ivory", image: "ivory-chikankari", brand: "House of Kari", occasions: ["WEDDING", "CASUAL"], addedDaysAgo: 45 },
  { id: "g21", category: "ETHNIC", name: "Banarasi Silk Saree", color: "Maroon", image: "maroon-saree", brand: "Ekaya", occasions: ["WEDDING", "PARTY"], addedDaysAgo: 22 },
];

type SeedOutfit = { id: string; occasion: Occasion; name: string; garments: string[] };

const OUTFITS: SeedOutfit[] = [
  { id: "o01", occasion: "FORMAL", name: "Tailored Minimalist", garments: ["g01", "g05", "g09", "g15"] },
  { id: "o02", occasion: "CASUAL", name: "Weekend Ease", garments: ["g02", "g06", "g10", "g16"] },
  { id: "o03", occasion: "FORMAL", name: "Crisp Classic", garments: ["g02", "g04", "g09", "g14"] },
  { id: "o04", occasion: "PARTY", name: "Satin Hour", garments: ["g03", "g07", "g13", "g15"] },
  { id: "o05", occasion: "CASUAL", name: "Off-Duty Classic", garments: ["g08", "g11", "g16"] },
  { id: "o06", occasion: "CASUAL", name: "Easy Ethnic", garments: ["g18", "g17"] },
  { id: "o07", occasion: "FORMAL", name: "Studio Neutrals", garments: ["g01", "g04", "g12", "g23"] },
  { id: "o08", occasion: "FORMAL", name: "Evening Sharp", garments: ["g03", "g22", "g12", "g15"] },
  { id: "o09", occasion: "WEDDING", name: "Festive Heirloom", garments: ["g19", "g17"] },
  { id: "o10", occasion: "WEDDING", name: "Gilded Celebration", garments: ["g21", "g17"] },
  { id: "o11", occasion: "WEDDING", name: "Mehendi Morning", garments: ["g20", "g17"] },
];

/** [outfitId, dayOffsetFromToday, eventName] — negatives are wear history. */
const PLANS: [string, number, string][] = [
  ["o07", -27, "Design review"],
  ["o01", -20, "Board meeting"],
  ["o06", -16, "Lunch with Nani"],
  ["o04", -12, "Birthday drinks"],
  ["o03", -9, "Client pitch"],
  ["o01", -5, "Quarterly review"],
  ["o02", -3, "Farmers market brunch"],
  ["o05", -1, "Gallery afternoon"],
  ["o08", 3, "Client dinner @ Cecconi's"],
  ["o09", 9, "Ananya's wedding"],
  ["o11", 16, "Mehendi morning"],
  ["o10", 23, "Rohan's reception"],
];

export function buildSeed(now: Date = new Date()): WardrobeState {
  const today = toISODate(now);
  const stamp = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  return {
    version: 1,
    profile: null,
    garments: GARMENTS.map((g) => ({
      id: g.id,
      category: g.category,
      name: g.name,
      color: g.color,
      image_url: `seed:${g.image}`,
      brand: g.brand,
      created_at: stamp(g.addedDaysAgo),
    })),
    garmentOccasions: GARMENTS.flatMap((g) =>
      g.occasions.map((occasion) => ({ garment_id: g.id, occasion })),
    ),
    outfits: OUTFITS.map((o, i) => ({
      id: o.id,
      occasion: o.occasion,
      name: o.name,
      created_at: stamp(40 - i),
    })),
    outfitGarments: OUTFITS.flatMap((o) =>
      o.garments.map((garment_id) => ({ outfit_id: o.id, garment_id })),
    ),
    calendarPlans: PLANS.map(([outfit_id, offset, event_name], i) => ({
      id: `p${String(i + 1).padStart(2, "0")}`,
      outfit_id,
      event_name,
      plan_date: shiftISO(today, offset),
    })),
  };
}

export function emptyState(profile: WardrobeState["profile"] = null): WardrobeState {
  return {
    version: 1,
    profile,
    garments: [],
    garmentOccasions: [],
    outfits: [],
    outfitGarments: [],
    calendarPlans: [],
  };
}
