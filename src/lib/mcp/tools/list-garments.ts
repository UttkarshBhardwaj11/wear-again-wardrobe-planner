import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CATEGORIES, OCCASIONS } from "@/lib/wardrobe/types";
import { occasionsFor } from "@/lib/wardrobe/derive";
import { garmentJson, loadCallerWardrobe, serverToday } from "../wardrobe";

export default defineTool({
  name: "list_garments",
  title: "List wardrobe pieces",
  description:
    "List the signed-in user's wardrobe pieces with category, colour, occasions and wear history. Optionally filter by category or occasion.",
  inputSchema: {
    category: z.enum(CATEGORIES).optional().describe("Only pieces in this category."),
    occasion: z.enum(OCCASIONS).optional().describe("Only pieces tagged for this occasion."),
    include_archived: z.boolean().optional().describe("Also include archived pieces. Defaults to false."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, occasion, include_archived }, ctx) => {
    const s = await loadCallerWardrobe(ctx);
    const today = serverToday();
    const garments = s.garments
      .filter((g) => include_archived || !g.deleted_at)
      .filter((g) => !category || g.category === category)
      .filter((g) => !occasion || occasionsFor(s, g.id).includes(occasion))
      .map((g) => garmentJson(s, g, today));
    const text = garments.length
      ? garments
          .map((g) => `${g.id}: ${g.name} (${g.category}, ${g.color}; ${g.occasions.join("/") || "no occasions"})${g.archived ? " [archived]" : ""}`)
          .join("\n")
      : "No matching pieces.";
    return { content: [{ type: "text", text }], structuredContent: { garments } };
  },
});
