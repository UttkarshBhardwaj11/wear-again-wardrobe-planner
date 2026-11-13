import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { garmentById, garmentPlanDates, wornWith } from "@/lib/wardrobe/derive";
import { garmentJson, loadCallerWardrobe, serverToday } from "../wardrobe";

export default defineTool({
  name: "get_garment",
  title: "Get a wardrobe piece",
  description:
    "Get one wardrobe piece by id, including the pieces it is most often worn with and the calendar events it appears in.",
  inputSchema: {
    garment_id: z.string().uuid().describe("Id of the piece, as returned by list_garments."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ garment_id }, ctx) => {
    const s = await loadCallerWardrobe(ctx);
    const g = garmentById(s, garment_id);
    if (!g) throw new ToolError("No piece with that id in your wardrobe.");
    const today = serverToday();
    const garment = {
      ...garmentJson(s, g, today),
      source_url: g.source_url ?? null,
      added_at: g.created_at,
      worn_with: wornWith(s, g.id)
        .slice(0, 6)
        .map(({ garment: other, count }) => ({ id: other.id, name: other.name, category: other.category, times: count })),
      events: garmentPlanDates(s, g.id).map(({ date, plan }) => ({ date, event: plan.event_name })),
    };
    const text = `${garment.name} (${garment.category}, ${garment.color}). Worn ${garment.times_worn} times; last ${garment.last_worn ?? "never"}.`;
    return { content: [{ type: "text", text }], structuredContent: { garment } };
  },
});
