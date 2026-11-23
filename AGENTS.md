<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Wardrobe data lives in Lovable Cloud tables (profiles, garments, garment_occasions, outfits, outfit_garments, calendar_plans), every row scoped by `user_id = auth.uid()` RLS; all reads/writes go through `src/lib/wardrobe/store.ts`, which mirrors the signed-in user's wardrobe in memory and saves optimistically in a serial queue (reload on failure) so screens stay synchronous.
- New accounts get the sample wardrobe from the `seed_sample_wardrobe` SQL function (signup trigger + `restore_sample_wardrobe` RPC); `src/lib/wardrobe/seed.ts` mirrors that data for tests, so change both together.
- Every app page except `/`, `/auth` and `/reset-password` lives under `src/routes/_authenticated/`, whose gate loads the wardrobe and sends un-named profiles to `/welcome`.
- Uploaded photos go to the private `garment-photos` bucket under `<user_id>/` and are stored as `storage:<path>`; `GarmentImage` resolves them to signed URLs via `photo-store.ts`.
- Sample-wardrobe photos are referenced as `seed:<key>` and resolved by `resolveImage`, so saved data survives rebuilt asset URLs.
- Outfit suggestions are rule-based in `src/lib/wardrobe/suggest.ts` (covered by `suggest.test.ts`); keep it pure and deterministic.
- The MCP server is defined in `src/lib/mcp/` (one `defineTool` per file, registered in `index.ts`) and served at `/mcp` via the TanStack MCP plugin; tools validate OAuth tokens and use a caller-scoped database client so RLS limits each caller to their own wardrobe. Browser-only WebMCP actions stay outside `defineMcp`.
- AI features (photo auto-tagging, Stylist chat) live in `src/lib/ai/stylist.functions.ts` as auth-protected server functions using the AI Gateway SDK; the stylist loads the caller wardrobe server-side and only returns garment ids that exist in it, so the UI never trusts model-invented pieces.
