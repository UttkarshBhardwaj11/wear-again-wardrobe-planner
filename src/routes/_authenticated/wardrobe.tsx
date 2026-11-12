import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Chip } from "@/components/mobi/Chip";
import { GarmentCard } from "@/components/mobi/GarmentCard";
import { Screen } from "@/components/mobi/Screen";
import { todayISO } from "@/lib/wardrobe/dates";
import { activeGarments, archivedGarments, occasionsFor, wearStats } from "@/lib/wardrobe/derive";
import { useWardrobe } from "@/lib/wardrobe/store";
import { CATEGORIES, CATEGORY_LABEL, OCCASION_LABEL, OCCASIONS, type Category, type Occasion } from "@/lib/wardrobe/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wardrobe")({
  head: () => ({
    meta: [
      { title: "Wardrobe — Mobidrobe" },
      { name: "description", content: "Browse, search and filter every piece in your digital wardrobe." },
      { property: "og:title", content: "Wardrobe — Mobidrobe" },
      { property: "og:description", content: "Browse, search and filter every piece in your digital wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Wardrobe,
});

function Wardrobe() {
  const state = useWardrobe();
  const today = todayISO();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "ALL">("ALL");
  const [occ, setOcc] = useState<Occasion | "ALL">("ALL");
  const [view, setView] = useState<"active" | "archived">("active");

  const source = view === "active" ? activeGarments(state) : archivedGarments(state);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return source
      .filter((g) => cat === "ALL" || g.category === cat)
      .filter((g) => occ === "ALL" || occasionsFor(state, g.id).includes(occ))
      .filter(
        (g) =>
          !term ||
          [g.name, g.brand ?? "", g.color, CATEGORY_LABEL[g.category]].some((f) => f.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [source, cat, occ, q, state]);

  const archivedCount = archivedGarments(state).length;

  return (
    <Screen>
      <AppHeader />
      <section className="px-5 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="label-tag text-primary">Your archive</p>
            <h1 className="font-display text-[30px] font-medium leading-tight">Wardrobe</h1>
          </div>
          <div className="flex rounded-full border border-border bg-muted p-1 text-sm">
            {(["active", "archived"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium capitalize transition-colors",
                  view === v ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground",
                )}
              >
                {v === "archived" ? `Archived${archivedCount ? ` (${archivedCount})` : ""}` : "In rotation"}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 flex h-12 items-center gap-2.5 rounded-2xl border border-border bg-card px-4 focus-within:border-primary">
          <Search className="size-5 text-muted-foreground" />
          <span className="sr-only">Search your wardrobe</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, brand or colour"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        <Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        {(["ALL", ...OCCASIONS] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOcc(o)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 label-tag transition-colors",
              occ === o ? "bg-rose/40 text-foreground" : "text-muted-foreground",
            )}
          >
            {o === "ALL" ? "Any occasion" : OCCASION_LABEL[o]}
          </button>
        ))}
      </div>

      <section className="px-5 pt-4">
        <p className="text-sm text-muted-foreground">{list.length} pieces</p>
        {list.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-primary/40 p-8 text-center">
            {view === "archived" ? (
              <>
                <Archive className="mx-auto size-8 text-muted-foreground" strokeWidth={1.4} />
                <p className="mt-3 font-display text-xl">No archived pieces</p>
                <p className="mt-1 text-sm text-muted-foreground">Archived items rest here and can be restored any time.</p>
              </>
            ) : (
              <>
                <p className="font-display text-xl">No matches</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different filter, or add something new.</p>
                <Link to="/add" className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  Add an item
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {list.map((g, i) => (
              <GarmentCard
                key={g.id}
                garment={g}
                eager={i < 4}
                occasions={occasionsFor(state, g.id)}
                wornCount={wearStats(state, g.id, today).wornCount}
              />
            ))}
          </div>
        )}
      </section>
    </Screen>
  );
}
