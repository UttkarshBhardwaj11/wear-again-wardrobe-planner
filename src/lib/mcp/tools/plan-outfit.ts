import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { garmentById } from "@/lib/wardrobe/derive";
import { OCCASIONS } from "@/lib/wardrobe/types";
import { supabaseForUser } from "../supabase";
import { isValidDate, loadCallerWardrobe } from "../wardrobe";

export default defineTool({
  name: "plan_outfit",
  title: "Lock an outfit to the calendar",
  description:
    "Save an outfit made of the user's pieces and lock it to a calendar date for an event (same as 'Lock outfit' in the app).",
  inputSchema: {
    garment_ids: z.array(z.string().uuid()).min(1).max(8).describe("Ids of the pieces in the outfit."),
    occasion: z.enum(OCCASIONS).describe("Occasion the outfit is for."),
    event_name: z.string().min(1).max(80).describe("Name of the event, e.g. 'Priya's sangeet'."),
    plan_date: z.string().describe("Date to wear it, YYYY-MM-DD."),
    outfit_name: z.string().max(60).optional().describe("Optional name for the outfit, e.g. a suggestion title."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ garment_ids, occasion, event_name, plan_date, outfit_name }, ctx) => {
    const event = event_name.trim();
    if (!event) throw new ToolError("Event name is required.");
    if (!isValidDate(plan_date)) throw new ToolError("plan_date must be a real date in YYYY-MM-DD form.");
    const ids = [...new Set(garment_ids)];
    const s = await loadCallerWardrobe(ctx);
    const pieces = ids.map((id) => garmentById(s, id));
    if (pieces.some((g) => !g || g.deleted_at)) throw new ToolError("Every piece must be in your active wardrobe.");

    const db = supabaseForUser(ctx);
    const outfitId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const fail = async (e: unknown): Promise<never> => {
      console.error("mcp plan_outfit failed", e);
      await db.from("outfits").delete().eq("id", outfitId);
      throw new ToolError("Couldn't save this plan. Please try again.");
    };

    const o = await db.from("outfits").insert({ id: outfitId, occasion, name: outfit_name?.trim() || null });
    if (o.error) return fail(o.error);
    const og = await db.from("outfit_garments").insert(ids.map((garment_id) => ({ outfit_id: outfitId, garment_id })));
    if (og.error) return fail(og.error);
    const p = await db.from("calendar_plans").insert({ id: planId, outfit_id: outfitId, event_name: event, plan_date });
    if (p.error) return fail(p.error);

    const names = pieces.map((g) => g!.name);
    return {
      content: [{ type: "text", text: `Locked "${event}" on ${plan_date}: ${names.join(", ")}.` }],
      structuredContent: { plan: { id: planId, outfit_id: outfitId, date: plan_date, event, pieces: names } },
    };
  },
});
