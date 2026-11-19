import { createServerFn } from "@tanstack/react-start";
import { generateChatCompletion, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchWardrobeWith } from "@/lib/wardrobe/fetch";
import { SWATCHES } from "@/lib/wardrobe/colors";
import { CATEGORIES, OCCASIONS, isCategory, isOccasion, type Category, type Occasion } from "@/lib/wardrobe/types";

const MODEL = "openai/gpt-6.1-terra" as const;

function friendly(e: unknown): string {
  if (e instanceof GatewayError) {
    console.error("AI gateway error", e.code, e.httpStatus, e.ids);
    if (e.httpStatus === 429) return "The stylist is busy right now. Try again in a minute.";
    if (e.httpStatus === 402) return "AI credits have run out for this app.";
  } else console.error(e);
  return "The stylist couldn't answer just now. Please try again.";
}

function contentOf(res: { choices?: { message?: { content?: unknown } }[] }): string {
  const c = res.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : "";
}

export interface PhotoTags {
  name?: string;
  category?: Category;
  color?: string;
  occasions: Occasion[];
}

export const tagGarmentPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (typeof input?.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(input.image))
      throw new Error("Expected an image");
    if (input.image.length > 6_000_000) throw new Error("Image too large");
    return input;
  })
  .handler(async ({ data }): Promise<{ ok: true; tags: PhotoTags } | { ok: false; error: string }> => {
    try {
      const res = await generateChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You tag clothing photos for a wardrobe app. Identify the single main garment. Name it in 2-4 words like a boutique label (e.g. 'Linen Camp Shirt'). Pick the closest colour from the list given.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Colours: ${SWATCHES.map((s) => s.name).join(", ")}` },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "garment_tags",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["name", "category", "color", "occasions"],
              properties: {
                name: { type: "string" },
                category: { type: "string", enum: [...CATEGORIES] },
                color: { type: "string", enum: SWATCHES.map((s) => s.name) },
                occasions: { type: "array", items: { type: "string", enum: [...OCCASIONS] } },
              },
            },
          },
        },
      });
      const raw = JSON.parse(contentOf(res) || "{}") as Record<string, unknown>;
      const occ = Array.isArray(raw.occasions) ? raw.occasions.filter(isOccasion) : [];
      return {
        ok: true,
        tags: {
          name: typeof raw.name === "string" ? raw.name.slice(0, 60) : undefined,
          category: isCategory(raw.category) ? raw.category : undefined,
          color: SWATCHES.some((s) => s.name === raw.color) ? (raw.color as string) : undefined,
          occasions: [...new Set(occ)],
        },
      };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    }
  });

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface StylistOutfit {
  title: string;
  occasion: Occasion;
  garment_ids: string[];
  note: string;
}

export const askStylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: ChatTurn[]; today: string; weather?: string }) => {
    if (!Array.isArray(input?.messages) || input.messages.length === 0) throw new Error("No messages");
    const messages = input.messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content ?? "").slice(0, 2000),
    }));
    return { messages, today: String(input.today ?? "").slice(0, 10), weather: input.weather ? String(input.weather).slice(0, 200) : undefined };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; reply: string; outfits: StylistOutfit[] } | { ok: false; error: string }> => {
    try {
      const w = await fetchWardrobeWith(context.supabase, context.userId);
      const active = w.garments.filter((g) => !g.deleted_at);
      const occBy = new Map<string, string[]>();
      for (const o of w.garmentOccasions) occBy.set(o.garment_id, [...(occBy.get(o.garment_id) ?? []), o.occasion]);
      const lastWorn = new Map<string, string>();
      const outfitPieces = new Map<string, string[]>();
      for (const og of w.outfitGarments) outfitPieces.set(og.outfit_id, [...(outfitPieces.get(og.outfit_id) ?? []), og.garment_id]);
      for (const p of w.calendarPlans) {
        if (p.plan_date > data.today) continue;
        for (const gid of outfitPieces.get(p.outfit_id) ?? []) if ((lastWorn.get(gid) ?? "") < p.plan_date) lastWorn.set(gid, p.plan_date);
      }
      const catalog = active
        .map((g) => `${g.id} | ${g.name} | ${g.category} | ${g.color} | ${(occBy.get(g.id) ?? []).join(",")} | last worn ${lastWorn.get(g.id) ?? "never"}`)
        .join("\n");
      const upcoming = w.calendarPlans
        .filter((p) => p.plan_date >= data.today)
        .slice(0, 10)
        .map((p) => `${p.plan_date}: ${p.event_name}`)
        .join("\n");

      const system = `You are Mobidrobe's personal stylist: warm, concise, editorial. Only suggest pieces from the user's wardrobe below, referenced by exact id. A complete outfit is either a top + bottom + footwear (optionally outerwear), or an ethnic piece + footwear. Suggest 0-3 outfits; give a short reply (under 90 words) explaining your styling thinking. If the user only chats, outfits can be empty.
Today: ${data.today}${data.weather ? `\nWeather: ${data.weather}` : ""}
Wardrobe (id | name | category | colour | occasions | last worn):
${catalog || "(empty)"}
Upcoming plans:
${upcoming || "(none)"}`;

      const res = await generateChatCompletion({
        model: MODEL,
        messages: [{ role: "system", content: system }, ...data.messages],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "stylist_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["reply", "outfits"],
              properties: {
                reply: { type: "string" },
                outfits: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["title", "occasion", "garment_ids", "note"],
                    properties: {
                      title: { type: "string" },
                      occasion: { type: "string", enum: [...OCCASIONS] },
                      garment_ids: { type: "array", items: { type: "string" } },
                      note: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const raw = JSON.parse(contentOf(res) || "{}") as { reply?: unknown; outfits?: unknown };
      const ids = new Set(active.map((g) => g.id));
      const outfits: StylistOutfit[] = (Array.isArray(raw.outfits) ? raw.outfits : [])
        .map((o: Record<string, unknown>) => ({
          title: String(o.title ?? "Outfit").slice(0, 60),
          occasion: isOccasion(o.occasion) ? o.occasion : ("CASUAL" as Occasion),
          garment_ids: [...new Set((Array.isArray(o.garment_ids) ? o.garment_ids : []).filter((x): x is string => typeof x === "string" && ids.has(x)))],
          note: String(o.note ?? "").slice(0, 240),
        }))
        .filter((o) => o.garment_ids.length >= 2)
        .slice(0, 3);
      return { ok: true, reply: typeof raw.reply === "string" ? raw.reply : "", outfits };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    }
  });
