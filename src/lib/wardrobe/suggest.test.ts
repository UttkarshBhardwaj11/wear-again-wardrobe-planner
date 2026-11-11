import { describe, expect, it } from "vitest";
import { occasionFromText } from "./classify";
import { buildSeed } from "./seed";
import { suggestOutfits } from "./suggest";

const now = new Date(2026, 10, 11);
const today = "2026-11-11";

describe("outfit suggestions", () => {
  it("excludes pieces worn within the last 7 days when 'avoid recently worn' is on", () => {
    const s = buildSeed(now);
    // Merino Turtleneck (g05) was worn 5 days ago in the sample wardrobe.
    const on = suggestOutfits(s, { occasion: "FORMAL", targetDate: today, avoidRecent: true, today });
    expect(on.suggestions.length).toBeGreaterThan(0);
    expect(on.suggestions.some((x) => x.garmentIds.includes("g05"))).toBe(false);
    const off = suggestOutfits(s, { occasion: "FORMAL", targetDate: today, avoidRecent: false, today });
    const flagged = off.suggestions.find((x) => x.garmentIds.includes("g05"));
    expect(flagged?.flags.some((f) => f.garmentId === "g05" && f.kind === "recent")).toBe(true);
  });

  it("never suggests archived pieces", () => {
    const s = buildSeed(now);
    s.garments = s.garments.map((g) => (g.id === "g17" ? { ...g, deleted_at: now.toISOString() } : g));
    const r = suggestOutfits(s, { occasion: "WEDDING", targetDate: today, avoidRecent: false, today });
    expect(r.suggestions.every((x) => !x.garmentIds.includes("g17"))).toBe(true);
  });

  it("reads the occasion from a description", () => {
    expect(occasionFromText("formal dinner")).toBe("FORMAL");
    expect(occasionFromText("college fest")).toBe("PARTY");
    expect(occasionFromText("Wedding Sangeet")).toBe("WEDDING");
    expect(occasionFromText("autumn brunch")).toBe("CASUAL");
  });
});
