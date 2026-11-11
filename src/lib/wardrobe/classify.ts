import type { Category, Occasion } from "./types";

const OCCASION_KEYWORDS: [Occasion, string[]][] = [
  [
    "WEDDING",
    ["wedding", "sangeet", "mehendi", "mehndi", "haldi", "reception", "shaadi", "engagement", "baraat", "festive", "diwali", "puja", "pooja", "eid", "roka", "cocktail night of"],
  ],
  ["PARTY", ["party", "fest", "club", "cocktail", "birthday", "night out", "date night", "drinks", "gig", "concert", "bar ", "rooftop", "new year"]],
  ["FORMAL", ["formal", "office", "meeting", "interview", "client", "dinner", "presentation", "conference", "work", "business", "gala", "pitch", "board", "review", "networking"]],
];

/** Infer the dress-code occasion from a free-text event description. */
export function occasionFromText(text: string): Occasion | null {
  const t = ` ${text.toLowerCase()} `;
  if (!t.trim()) return null;
  for (const [occ, words] of OCCASION_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return occ;
  }
  return "CASUAL";
}

const CATEGORY_KEYWORDS: [Category, string[]][] = [
  ["ETHNIC", ["kurta", "saree", "sari", "lehenga", "anarkali", "sherwani", "salwar", "dupatta", "kurti", "bandhgala", "churidar"]],
  ["FOOTWEAR", ["shoe", "boot", "sneaker", "heel", "sandal", "jutti", "mojari", "loafer", "trainer", "flat", "mule", "pump", "oxford", "brogue", "kolhapuri"]],
  ["OUTERWEAR", ["coat", "jacket", "blazer", "trench", "parka", "cardigan", "overshirt", "shacket", "gilet"]],
  ["BOTTOMS", ["jean", "trouser", "pant", "skirt", "short", "chino", "jogger", "legging", "culotte"]],
  ["TOPS", ["shirt", "top", "tee", "t-shirt", "sweater", "blouse", "knit", "jumper", "polo", "camisole", "cami", "tank", "turtleneck", "hoodie", "sweatshirt"]],
];

export function categoryFromText(text: string): Category | null {
  const t = text.toLowerCase();
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return null;
}
