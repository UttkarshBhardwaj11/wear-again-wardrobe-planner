import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Archive, ArrowLeft, CalendarDays, ExternalLink, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ColorDot } from "@/components/mobi/GarmentCard";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { ProfileAvatar } from "@/components/mobi/AppHeader";
import { Tag } from "@/components/mobi/Chip";
import { Screen } from "@/components/mobi/Screen";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import { prettyDate, relativeDayLabel, todayISO } from "@/lib/wardrobe/dates";
import { garmentById, occasionsFor, wearStats, wornWith } from "@/lib/wardrobe/derive";
import { archiveGarment, restoreGarment, useWardrobe } from "@/lib/wardrobe/store";
import { CATEGORY_LABEL, OCCASION_LABEL } from "@/lib/wardrobe/types";

export const Route = createFileRoute("/_authenticated/item/$id")({
  head: () => ({
    meta: [
      { title: "Item — Mobidrobe" },
      { name: "description", content: "Garment details, occasions and the pieces you pair it with most." },
      { property: "og:title", content: "Item — Mobidrobe" },
      { property: "og:description", content: "Garment details, occasions and the pieces you pair it with most." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const state = useWardrobe();
  const hydrated = useHydrated();
  const router = useRouter();
  const navigate = useNavigate();
  const today = todayISO();
  const g = garmentById(state, id);

  if (!g) {
    return (
      <Screen>
        <div className="px-6 pt-24 text-center">
          <p className="font-display text-2xl">{hydrated ? "This piece isn't in your wardrobe" : "Loading…"}</p>
          {hydrated && (
            <Button asChild size="lg" className="mt-6">
              <Link to="/wardrobe">Back to wardrobe</Link>
            </Button>
          )}
        </div>
      </Screen>
    );
  }

  const occ = occasionsFor(state, g.id);
  const stats = wearStats(state, g.id, today);
  const pairs = wornWith(state, g.id).slice(0, 8);
  const archived = !!g.deleted_at;

  const onArchive = () => {
    archiveGarment(g.id);
    toast(`${g.name} archived`, {
      description: "It won't appear in suggestions. Past plans stay intact.",
      action: { label: "Undo", onClick: () => restoreGarment(g.id) },
    });
  };

  return (
    <Screen>
      <div className="relative">
        <GarmentImage src={g.image_url} alt={g.name} eager className="aspect-[4/5] w-full" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => (window.history.length > 1 ? router.history.back() : navigate({ to: "/wardrobe" }))}
            className="grid size-12 place-items-center rounded-full bg-card/85 backdrop-blur"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="grid size-12 place-items-center rounded-full bg-card/85 backdrop-blur"
              >
                <MoreHorizontal className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                <DropdownMenuItem onSelect={() => navigate({ to: "/add/details", search: { edit: g.id } })}>
                  <Pencil /> Edit details
                </DropdownMenuItem>
                {archived ? (
                  <DropdownMenuItem onSelect={() => restoreGarment(g.id)}>
                    <RotateCcw /> Restore to rotation
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onArchive} className="text-destructive focus:text-destructive">
                    <Archive /> Archive item
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <ProfileAvatar />
          </div>
        </div>
        {g.source_url && (
          <a
            href={g.source_url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-10 right-5 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 label-tag backdrop-blur"
          >
            <ExternalLink className="size-3.5" /> View product
          </a>
        )}
      </div>

      <section className="relative -mt-6 rounded-t-[28px] bg-background px-5 pt-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />

        {archived && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-warning px-4 py-3 text-warning-foreground">
            <p className="text-sm">Archived {prettyDate(g.deleted_at!.slice(0, 10), "MMM d")} — hidden from suggestions.</p>
            <button type="button" onClick={() => restoreGarment(g.id)} className="text-sm font-semibold underline">
              Restore
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-deep">
            {CATEGORY_LABEL[g.category]}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
            <ColorDot color={g.color} /> {g.color}
          </span>
          {g.brand && <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{g.brand}</span>}
        </div>

        <h1 className="mt-4 font-display text-[32px] font-medium leading-[1.15] tracking-tight">{g.name}</h1>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <CalendarDays className="size-4 text-primary" />
            {stats.lastWorn ? (
              <>
                Last worn: <span className="font-medium text-foreground">{relativeDayLabel(stats.lastWorn, today)}</span>
                <span>({prettyDate(stats.lastWorn)})</span>
              </>
            ) : (
              "Not worn yet"
            )}
          </p>
          <Tag className="shrink-0">{stats.outfitCount} outfits</Tag>
        </div>
        {stats.nextPlanned && (
          <Link
            to="/calendar"
            search={{ date: stats.nextPlanned.date }}
            className="mt-2 inline-block text-sm text-primary-deep underline-offset-4 hover:underline"
          >
            Planned for {stats.nextPlanned.event} · {prettyDate(stats.nextPlanned.date)}
          </Link>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {occ.map((o) => (
            <Tag key={o} tone="stone">
              {OCCASION_LABEL[o]}
            </Tag>
          ))}
        </div>

        <div className="mt-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-[26px] font-medium">Worn With</h2>
            <p className="text-sm text-muted-foreground">Pieces you pair with this most</p>
          </div>
          <Link to="/calendar" className="text-sm font-semibold text-primary-deep">
            View history
          </Link>
        </div>
        {pairs.length ? (
          <div className="-mx-5 mt-4 flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
            {pairs.map(({ garment: p, count }) => (
              <Link key={p.id} to="/item/$id" params={{ id: p.id }} className="w-24 shrink-0 text-center">
                <div className="relative mx-auto size-24 rounded-full border border-border bg-card p-1">
                  <GarmentImage src={p.image_url} alt={p.name} className="size-full rounded-full" />
                  <span className="absolute bottom-0 right-0 rounded-full border border-border bg-card px-1.5 text-xs font-semibold">
                    {count}×
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{p.name.split(" ").slice(-2).join(" ")}</p>
                <p className="truncate text-[11px] text-muted-foreground">{p.color}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            No pairings yet — lock an outfit with this piece and it'll show up here.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="label-micro text-muted-foreground">In your wardrobe</p>
          <p className="mt-1 text-[15px] font-semibold">
            Added {prettyDate(g.created_at.slice(0, 10), "MMM d, yyyy")}
          </p>
          <p className="text-sm text-muted-foreground">
            Worn {stats.wornCount} {stats.wornCount === 1 ? "time" : "times"} · in {stats.outfitCount} saved{" "}
            {stats.outfitCount === 1 ? "outfit" : "outfits"}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            asChild
            variant="outline"
            size="xl"
            className="flex-1 border-border bg-background text-foreground"
          >
            <Link to="/add/details" search={{ edit: g.id }}>
              <Pencil /> Edit
            </Link>
          </Button>
          {archived ? (
            <Button variant="outline" size="xl" className="flex-1" onClick={() => restoreGarment(g.id)}>
              <RotateCcw /> Restore
            </Button>
          ) : (
            <Button variant="outline" size="xl" className="flex-1 text-destructive hover:text-destructive" onClick={onArchive}>
              <Archive /> Archive
            </Button>
          )}
        </div>
        {!archived && (
          <Button asChild size="xl" className="mt-3 w-full shadow-lift">
            <Link to="/style" search={{ with: g.id, occasion: occ[0] }}>
              Plan an Outfit With This
            </Link>
          </Button>
        )}
      </section>
    </Screen>
  );
}
