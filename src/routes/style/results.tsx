import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, Info, RefreshCw, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Tag } from "@/components/mobi/Chip";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { LockOutfitSheet } from "@/components/mobi/LockOutfitSheet";
import { Screen } from "@/components/mobi/Screen";
import { Button } from "@/components/ui/button";
import { prettyDate, relativeDayLabel, todayISO } from "@/lib/wardrobe/dates";
import { garmentById } from "@/lib/wardrobe/derive";
import { parseStyleSearch } from "@/lib/wardrobe/search";
import { lockOutfit, StorageFullError, useWardrobe } from "@/lib/wardrobe/store";
import { PAGE_SIZE, suggestOutfits, type Suggestion } from "@/lib/wardrobe/suggest";
import { CATEGORY_LABEL, CATEGORY_SINGULAR, OCCASION_LABEL, type Garment } from "@/lib/wardrobe/types";
import { describeWeather, useForecast, usePlace } from "@/lib/weather";

export const Route = createFileRoute("/style/results")({
  validateSearch: parseStyleSearch,
  head: () => ({
    meta: [
      { title: "Outfit ideas — Mobidrobe" },
      { name: "description", content: "Curated outfit combinations from your wardrobe, scored for the occasion." },
      { property: "og:title", content: "Outfit ideas — Mobidrobe" },
      { property: "og:description", content: "Curated outfit combinations from your wardrobe, scored for the occasion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Results,
});

function Results() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const state = useWardrobe();
  const today = todayISO();
  const occasion = search.occasion ?? "CASUAL";
  const date = search.date ?? today;
  const avoid = search.avoid ?? true;
  const page = search.page ?? 0;
  const [locking, setLocking] = useState<Suggestion | null>(null);

  const { place } = usePlace();
  const forecast = useForecast(place);
  const day = forecast.data?.days.find((d) => d.date === date);

  const result = useMemo(
    () => suggestOutfits(state, { occasion, targetDate: date, avoidRecent: avoid, anchorId: search.with }),
    [state, occasion, date, avoid, search.with],
  );
  const total = result.suggestions.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = page % pages;
  const shown = result.suggestions.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const occasionText = search.q || OCCASION_LABEL[occasion];
  const pieces = (s: Suggestion) => s.garmentIds.map((id) => garmentById(state, id)).filter((g): g is Garment => !!g);

  const onConfirm = (v: { event_name: string; plan_date: string }) => {
    if (!locking) return;
    try {
      lockOutfit({
        occasion,
        name: locking.title,
        garmentIds: locking.garmentIds,
        event_name: v.event_name,
        plan_date: v.plan_date,
      });
      setLocking(null);
      toast.success(`Locked for ${prettyDate(v.plan_date, "EEE, MMM d")}`, { description: v.event_name });
      navigate({ to: "/calendar", search: { date: v.plan_date } });
    } catch (e) {
      toast.error(e instanceof StorageFullError ? e.message : "Couldn't save this plan. Please try again.");
    }
  };

  return (
    <Screen>
      <AppHeader />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3">
          <Link
            to="/style"
            search={{ q: search.q, occasion, date, avoid, with: search.with }}
            aria-label="Back to planner"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[28px] font-medium leading-tight">Outfit Ideas</h1>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              Occasion: {occasionText} · {prettyDate(date, "EEE, MMM d")}
            </p>
          </div>
          <Link
            to="/style"
            search={{ q: search.q, occasion, date, avoid, with: search.with }}
            aria-label="Adjust filters"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-muted"
          >
            <SlidersHorizontal className="size-5" />
          </Link>
        </div>

        <div className="mt-5 flex gap-3 rounded-2xl bg-muted p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">Curated from your wardrobe</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              Balanced for a {OCCASION_LABEL[occasion].toLowerCase()} dress code
              {day ? `, ${day.max}°C and ${describeWeather(day.code).label.toLowerCase()}` : ""}
              {avoid
                ? `. ${result.excludedRecent ? `${result.excludedRecent} recently worn ${result.excludedRecent === 1 ? "piece" : "pieces"} left out.` : "Nothing recent to skip."}`
                : ". Recently worn pieces are flagged."}
            </p>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-primary/40 p-6 text-center">
            <p className="font-display text-2xl">No complete looks yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.missing.length
                ? `You need ${result.missing.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(" and ")} tagged ${OCCASION_LABEL[occasion].toLowerCase()} to build an outfit.`
                : "Every matching piece was worn recently."}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {avoid && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate({ to: "/style/results", search: { ...search, avoid: false, page: undefined } })}
                >
                  Include recently worn pieces
                </Button>
              )}
              <Button asChild size="lg">
                <Link to="/add">Add a piece</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {shown.map((s, i) => (
              <ComboCard
                key={s.key}
                index={current * PAGE_SIZE + i + 1}
                suggestion={s}
                garments={pieces(s)}
                today={today}
                onLock={() => setLocking(s)}
              />
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/style/results", search: { ...search, page: current + 1 >= pages ? undefined : current + 1 }, replace: true })}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-muted px-6 text-[15px] font-semibold text-primary-deep"
            >
              <RefreshCw className="size-4" /> Regenerate Suggestions
            </button>
          </div>
        )}
        {total > 0 && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {shown.length} of {total} generated combinations shown
          </p>
        )}
      </div>

      {locking && (
        <LockOutfitSheet
          open={!!locking}
          onOpenChange={(o) => !o && setLocking(null)}
          outfitTitle={`Combo ${String(result.suggestions.indexOf(locking) + 1).padStart(2, "0")}: ${locking.title}`}
          garments={pieces(locking)}
          defaultDate={date}
          defaultEvent={search.q ?? ""}
          onConfirm={onConfirm}
        />
      )}
    </Screen>
  );
}

function ComboCard({
  index,
  suggestion: s,
  garments,
  today,
  onLock,
}: {
  index: number;
  suggestion: Suggestion;
  garments: Garment[];
  today: string;
  onLock: () => void;
}) {
  const recent = s.flags.filter((f) => f.kind === "recent");
  const planned = s.flags.filter((f) => f.kind === "planned");
  const flagged = new Set(s.flags.map((f) => f.garmentId));
  const nameOf = (id: string) => garments.find((g) => g.id === id)?.name ?? "A piece";

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-ambient">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-[24px] font-medium leading-tight">
          Combo {String(index).padStart(2, "0")}: {s.title}
        </h2>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-medium text-primary-deep">
          <Target className="size-3.5" /> {s.score}% match
        </span>
      </div>
      <p className="mt-1 truncate text-sm text-muted-foreground">{garments.map((g) => g.name).join(" • ")}</p>

      {(recent.length > 0 || planned.length > 0) && (
        <div className="mt-3 space-y-1.5">
          {recent.slice(0, 2).map((f) => (
            <p key={f.garmentId + f.date} className="flex items-start gap-2 rounded-xl bg-warning px-3 py-2 text-sm text-warning-foreground">
              <Clock className="mt-0.5 size-4 shrink-0" />
              {nameOf(f.garmentId)} worn {relativeDayLabel(f.date, today).toLowerCase()} · {f.event}
            </p>
          ))}
          {planned.slice(0, 2).map((f) => (
            <p key={f.garmentId + f.date} className="flex items-start gap-2 rounded-xl bg-rose/20 px-3 py-2 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-primary-deep" />
              {nameOf(f.garmentId)} is already planned for {f.event} ({prettyDate(f.date, "MMM d")})
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {garments.map((g) => (
          <Link key={g.id} to="/item/$id" params={{ id: g.id }} className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-muted">
              <GarmentImage src={g.image_url} alt={g.name} className="aspect-[3/4] w-full" />
              <span className="absolute bottom-1 left-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium">
                {CATEGORY_SINGULAR[g.category]}
              </span>
              {flagged.has(g.id) && (
                <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  !
                </span>
              )}
            </div>
            <p className="mt-1.5 truncate text-xs">{g.name}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {s.tags.map((t, i) => (
            <Tag key={t} tone={i === 0 ? "rose" : "stone"}>
              {t}
            </Tag>
          ))}
        </div>
        <Button size="lg" className="shrink-0 bg-primary-deep px-5 hover:bg-primary-deep/90" onClick={onLock}>
          <CalendarDays /> Lock to Calendar
        </Button>
      </div>
    </article>
  );
}
