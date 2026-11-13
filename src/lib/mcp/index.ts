import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getGarment from "./tools/get-garment";
import listCalendarPlans from "./tools/list-calendar-plans";
import listGarments from "./tools/list-garments";
import planOutfit from "./tools/plan-outfit";
import suggestOutfits from "./tools/suggest-outfits";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "wear-again-wardrobe-planner",
  title: "Wear Again Wardrobe Planner",
  version: "0.1.0",
  instructions:
    "Tools for the user's Mobidrobe wardrobe: browse their pieces, see what's on their outfit calendar, get outfit suggestions for an occasion and date, and lock an outfit to the calendar. All data belongs to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGarments, getGarment, listCalendarPlans, suggestOutfits, planOutfit],
});
