import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Garment, WardrobeState } from "./types";

/** Loads one user's wardrobe through any Supabase client; RLS limits rows to that user. */
export type WardrobeClient = SupabaseClient<Database>;

type Result<T> = { data: T[] | null; error: unknown };

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Result<T>>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export async function fetchWardrobeWith(client: WardrobeClient, uid: string): Promise<WardrobeState> {
  const [profileRes, garments, garmentOccasions, outfits, outfitGarments, plans] = await Promise.all([
    client.from("profiles").select("name, onboarded_at").eq("id", uid).maybeSingle(),
    fetchAll((a, b) =>
      client.from("garments").select("*").order("created_at", { ascending: false }).order("id").range(a, b),
    ),
    fetchAll((a, b) =>
      client.from("garment_occasions").select("garment_id, occasion").order("garment_id").order("occasion").range(a, b),
    ),
    fetchAll((a, b) =>
      client.from("outfits").select("id, occasion, name, created_at").order("created_at").order("id").range(a, b),
    ),
    fetchAll((a, b) =>
      client.from("outfit_garments").select("outfit_id, garment_id").order("outfit_id").order("garment_id").range(a, b),
    ),
    fetchAll((a, b) =>
      client
        .from("calendar_plans")
        .select("id, outfit_id, event_name, plan_date")
        .order("plan_date")
        .order("created_at")
        .range(a, b),
    ),
  ]);
  if (profileRes.error) throw profileRes.error;
  const p = profileRes.data;

  return {
    version: 1,
    profile: p?.onboarded_at ? { name: p.name, created_at: p.onboarded_at } : null,
    garments: garments.map((r) => {
      const g: Garment = {
        id: r.id,
        category: r.category,
        name: r.name,
        color: r.color,
        image_url: r.image_url,
        created_at: r.created_at,
      };
      if (r.source_url) g.source_url = r.source_url;
      if (r.brand) g.brand = r.brand;
      if (r.deleted_at) g.deleted_at = r.deleted_at;
      return g;
    }),
    garmentOccasions,
    outfits: outfits.map((o) => (o.name ? { ...o, name: o.name } : { id: o.id, occasion: o.occasion, created_at: o.created_at })),
    outfitGarments,
    calendarPlans: plans,
  };
}
