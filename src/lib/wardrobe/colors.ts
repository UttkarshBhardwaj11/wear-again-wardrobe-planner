export interface Swatch {
  name: string;
  hex: string;
  neutral: boolean;
}

/** Garment colour palette. Hex values are garment data, not theme colours. */
export const SWATCHES: Swatch[] = [
  { name: "Terracotta", hex: "#B86B28", neutral: false },
  { name: "Ivory", hex: "#F3EEE4", neutral: true },
  { name: "Sage", hex: "#7C8B6A", neutral: false },
  { name: "Navy", hex: "#1F2C46", neutral: true },
  { name: "Black", hex: "#1C1B1A", neutral: true },
  { name: "Dusty Rose", hex: "#DDA7A5", neutral: false },
  { name: "White", hex: "#FFFFFF", neutral: true },
  { name: "Cream", hex: "#EDE3D1", neutral: true },
  { name: "Ecru", hex: "#E6DCC6", neutral: true },
  { name: "Camel", hex: "#C19A6B", neutral: true },
  { name: "Tan", hex: "#A86B3C", neutral: true },
  { name: "Chocolate", hex: "#5A3A29", neutral: true },
  { name: "Charcoal", hex: "#3F3F42", neutral: true },
  { name: "Grey", hex: "#9A9A9C", neutral: true },
  { name: "Indigo", hex: "#2E3A5C", neutral: true },
  { name: "Rust", hex: "#A4502A", neutral: false },
  { name: "Mustard", hex: "#C99A2E", neutral: false },
  { name: "Emerald", hex: "#1F5A43", neutral: false },
  { name: "Olive", hex: "#5F6136", neutral: false },
  { name: "Maroon", hex: "#6E1E2B", neutral: false },
  { name: "Red", hex: "#B3261E", neutral: false },
  { name: "Blush", hex: "#EFC9C0", neutral: false },
  { name: "Lilac", hex: "#B7A3C9", neutral: false },
  { name: "Sky", hex: "#9EBCD9", neutral: false },
  { name: "Gold", hex: "#C9A35A", neutral: false },
  { name: "Silver", hex: "#C5C7CA", neutral: true },
];

export const PRIMARY_SWATCH_COUNT = 6;

export function swatchFor(name: string): Swatch {
  const found = SWATCHES.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  return found ?? { name, hex: "#C9BFB4", neutral: true };
}

export function isNeutral(name: string): boolean {
  return swatchFor(name).neutral;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Closest named swatch to an RGB value (simple weighted distance). */
export function nearestSwatch(r: number, g: number, b: number): Swatch {
  let best = SWATCHES[0];
  let bestD = Infinity;
  for (const s of SWATCHES) {
    const [sr, sg, sb] = hexToRgb(s.hex);
    const d = 2 * (r - sr) ** 2 + 4 * (g - sg) ** 2 + 3 * (b - sb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Find a palette colour mentioned in free text such as a product title. */
export function colorFromText(text: string): string | null {
  const t = text.toLowerCase();
  const aliases: Record<string, string> = {
    "off-white": "Ivory",
    "off white": "Ivory",
    beige: "Camel",
    brown: "Chocolate",
    denim: "Indigo",
    blue: "Navy",
    green: "Emerald",
    pink: "Blush",
    burgundy: "Maroon",
    wine: "Maroon",
    orange: "Rust",
    yellow: "Mustard",
    gray: "Grey",
  };
  for (const s of SWATCHES) if (t.includes(s.name.toLowerCase())) return s.name;
  for (const [k, v] of Object.entries(aliases)) if (t.includes(k)) return v;
  return null;
}
