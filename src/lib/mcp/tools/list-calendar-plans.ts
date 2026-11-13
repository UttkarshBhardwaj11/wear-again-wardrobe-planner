import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { planView } from "@/lib/wardrobe/derive";
import { isValidDate, loadCallerWardrobe, serverToday } from "../wardrobe";

function shift(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default defineTool({
  name: "list_calendar_plans",
  title: "List calendar outfits",
  description:
    "List the outfits on the user's calendar between two dates (past wear history and upcoming plans), with the pieces in each.",
  inputSchema: {
    from: z.string().optional().describe("First date, YYYY-MM-DD. Defaults to 30 days ago."),
    to: z.string().optional().describe("Last date, YYYY-MM-DD. Defaults to 60 days from today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    const today = serverToday();
    const start = from ?? shift(today, -30);
    const end = to ?? shift(today, 60);
    if (!isValidDate(start) || !isValidDate(end)) throw new ToolError("Dates must be real dates in YYYY-MM-DD form.");
    if (start > end) throw new ToolError("`from` must be on or before `to`.");
    const s = await loadCallerWardrobe(ctx);
    const plans = s.calendarPlans
      .filter((p) => p.plan_date >= start && p.plan_date <= end)
      .slice(0, 200)
      .map((p) => {
        const v = planView(s, p);
        return {
          id: p.id,
          date: p.plan_date,
          event: p.event_name,
          outfit_name: v.outfit?.name ?? null,
          occasion: v.outfit?.occasion ?? null,
          pieces: v.garments.map((g) => ({ id: g.id, name: g.name, category: g.category })),
        };
      });
    const text = plans.length
      ? plans.map((p) => `${p.date} — ${p.event}: ${p.pieces.map((x) => x.name).join(", ")}`).join("\n")
      : `Nothing on the calendar between ${start} and ${end}.`;
    return { content: [{ type: "text", text }], structuredContent: { from: start, to: end, plans } };
  },
});
