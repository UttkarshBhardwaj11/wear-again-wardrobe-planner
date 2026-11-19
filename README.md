# Wear Again Wardrobe Planner

Build "Mobidrobe" for mobile web based on the attached product spec, screen designs (reference for layout + visual feel), and updated data model.

Updated Data Model:
- Enums:
  - Category: TOPS, BOTTOMS, FOOTWEAR, ETHNIC, OUTERWEAR
  - Occasion: CASUAL, FORMAL, PARTY, WEDDING
- Entities:
  - Garment: id, category, name, color, image_url, source_url?, brand?, created_at, deleted_at?
  - GarmentOccasion: garment_id, occasion
  - Outfit: id, occasion, name?, created_at
  - OutfitGarment: outfit_id, garment_id
  - CalendarPlan: id, outfit_id, event_name, plan_date

Screens to build (following stitch_mobidrobe_app_design_spec):
1. Screen 1: Splash / Onboarding (brand entry, value prop, user setup)
2. Screen 2: Home Dashboard (rotation stats, weather/styling prompt, category filters, 2-column garment grid, bottom navigation)
3. Screen 3: Add Item (upload photo or paste product URL)
4. Screen 4: Item Details & Tagging (name, category, color picker swatches, occasion multi-select tags)
5. Screen 5: Item Detail View (garment lookbook card, attributes, "Worn With" pairing history, archive/edit actions supporting deleted_at)
6. Screen 6: Get Outfit Suggestions (occasion picker & quick chips, target date, "Avoid recently worn" toggle)
7. Screen 7: Outfit Suggestion Results (curated outfit combo cards with title, piece breakdown, match score, lock CTA)
8. Screen 8: Lock Outfit to Calendar (bottom sheet/modal to name event, pick date, and lock outfit)
9. Screen 9: Outfit Calendar (month and week calendar view of planned outfits and past wear history)

Styling:
Warm Linen (#FAF9F7) canvas, Terracotta (#B86B28) primary accents, Deep Umber (#4A3B32) text, Playfair Display for editorial headlines, and Inter for clean UI typography. Include rich pre-seeded wardrobe pieces, combos, and calendar entries so the app is instantly usable and interactive.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wear-again-wardrobe-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc82c377-5f10-45aa-b44e-b8c26dff126f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
