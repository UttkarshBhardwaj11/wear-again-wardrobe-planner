import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { garmentById } from "@/lib/wardrobe/derive";
import { suggestOutfits } from "@/lib/wardrobe/suggest";
import { OCCASIONS } from "@/lib/wardrobe/types";
import { isValidDate, loadCallerWardrobe, serverToday } from "../wardrobe";

export default defineTool({
  name: "suggest_outfits",
  title: "Suggest outfits",
  description:
    "Suggest outfit combinations from the user's wardrobe for an occasion and date, ranked by match score. Use plan_outfit to lock one to the calendar.",
  inputSchema: {
    occasion: z.enum(OCCASIONS).describe("The occasion to dress for."),
    target_date: z.string().describe("Date the outfit is for, YYYY-MM-DD."),
    avoid_recently_worn: z.boolean().optional().describe("Skip pieces worn in the week before the date. Defaults to true."),
    anchor_garment_id: z.string().uuid().optional().describe("Only suggest outfits that include this piece."),
    today: z.string().optional().describe("The user's local date, YYYY-MM-DD. Defaults to today's UTC date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ occasion, target_date, avoid_recently_worn, anchor_garment_id, today }, ctx) => {
    const now = today ?? serverToday();
    if (!isValidDate(target_date) || !isValidDate(now)) throw new ToolError("Dates must be real dates in YYYY-MM-DD form.");
    const s = await loadCallerWardrobe(ctx);
    if (anchor_garment_id) {
      const anchor = garmentById(s, anchor_garment_id);
      if (!anchor || anchor.deleted_at) throw new ToolError("That piece isn't in your active wardrobe.");
    }
    const result = suggestOutfits(s, {
      occasion,
      targetDate: target_date,
      avoidRecent: avoid_recently_worn ?? true,
      anchorId: anchor_garment_id,
      today: now,
    });
    const suggestions = result.suggestions.map((sg) => ({
      title: sg.title,
      occasion: sg.occasion,
      score: sg.score,
      tags: sg.tags,
      garment_ids: sg.garmentIds,
      pieces: sg.garmentIds.map((id) => {
        const g = garmentById(s, id);
        return { id, name: g?.name ?? "Unknown", category: g?.category ?? null, color: g?.color ?? null };
      }),
      flags: sg.flags.map((f) => ({ garment_id: f.garmentId, kind: f.kind, date: f.date, event: f.event })),
    }));
    const text = suggestions.length
      ? suggestions.map((sg) => `${sg.title} (${sg.score}%): ${sg.pieces.map((p) => p.name).join(" + ")}`).join("\n")
      : `No complete outfits for ${occasion}.${result.missing.length ? ` Missing: ${result.missing.join(", ")}.` : ""}`;
    return {
      content: [{ type: "text", text }],
      structuredContent: { suggestions, excluded_recently_worn: result.excludedRecent, missing_categories: result.missing },
    };
  },
});
