import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import {
  ArrowUpRight,
  Briefcase,
  Coffee,
  Gem,
  History,
  NotebookPen,
  PartyPopper,
  RotateCcw,
  UtensilsCrossed,
  WandSparkles,
  Wine,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Chip } from "@/components/mobi/Chip";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { MonthGrid, monthOf } from "@/components/mobi/MonthGrid";
import { Screen } from "@/components/mobi/Screen";
import { WeatherIcon } from "@/components/mobi/WeatherIcon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { occasionFromText } from "@/lib/wardrobe/classify";
import { fromISODate, prettyDate, toISODate, todayISO } from "@/lib/wardrobe/dates";
import { garmentById } from "@/lib/wardrobe/derive";
import { parseStyleSearch } from "@/lib/wardrobe/search";
import { useWardrobe } from "@/lib/wardrobe/store";
import { RECENT_WINDOW_DAYS, suggestOutfits } from "@/lib/wardrobe/suggest";
import { CATEGORY_SINGULAR, OCCASION_LABEL, OCCASIONS, type Occasion } from "@/lib/wardrobe/types";
import { describeWeather, layerAdvice, useForecast, usePlace } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/style/")({
  validateSearch: parseStyleSearch,
  head: () => ({
    meta: [
      { title: "Plan an outfit — Mobidrobe" },
      { name: "description", content: "Describe the occasion, pick a day and get outfit combinations from your own wardrobe." },
      { property: "og:title", content: "Plan an outfit — Mobidrobe" },
      { property: "og:description", content: "Describe the occasion, pick a day and get outfit combinations from your own wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanOutfit,
});

const QUICK: { label: string; icon: typeof Coffee }[] = [
  { label: "Autumn Brunch", icon: Coffee },
  { label: "Client Meeting", icon: Briefcase },
  { label: "Formal Dinner", icon: UtensilsCrossed },
  { label: "Art Gallery Opening", icon: Wine },
  { label: "College Fest", icon: PartyPopper },
  { label: "Wedding Sangeet", icon: Gem },
];

function PlanOutfit() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const state = useWardrobe();
  const today = todayISO();
  const anchor = search.with ? garmentById(state, search.with) : undefined;

  const [q, setQ] = useState(search.q ?? "");
  const [manual, setManual] = useState<Occasion | null>(search.occasion ?? null);
  const [date, setDate] = useState(search.date && search.date >= today ? search.date : today);
  const [avoid, setAvoid] = useState(search.avoid ?? true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => monthOf(date));
  const [anchorOn, setAnchorOn] = useState(!!anchor);

  const inferred = occasionFromText(q);
  const occasion: Occasion = manual ?? inferred ?? "CASUAL";

  const { place } = usePlace();
  const forecast = useForecast(place);
  const day = forecast.data?.days.find((d) => d.date === date);

  const week = useMemo(() => {
    const start = fromISODate(date) < addDays(fromISODate(today), 7) ? fromISODate(today) : fromISODate(date);
    return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
  }, [date, today]);

  const preview = useMemo(
    () =>
      suggestOutfits(state, {
        occasion,
        targetDate: date,
        avoidRecent: avoid,
        anchorId: anchorOn ? anchor?.id : undefined,
      }).suggestions[0],
    [state, occasion, date, avoid, anchorOn, anchor?.id],
  );

  const reset = () => {
    setQ("");
    setManual(null);
    setDate(today);
    setAvoid(true);
    setAnchorOn(false);
  };

  const go = () =>
    navigate({
      to: "/style/results",
      search: {
        occasion,
        date,
        avoid,
        q: q.trim() || undefined,
        with: anchorOn && anchor ? anchor.id : undefined,
      },
    });

  return (
    <Screen>
      <AppHeader />
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <span className="size-11" />
          <h1 className="font-display text-[28px] font-medium">Plan an Outfit</h1>
          <button
            type="button"
            aria-label="Reset"
            onClick={reset}
            className="grid size-11 place-items-center rounded-full bg-muted"
          >
            <RotateCcw className="size-5" />
          </button>
        </div>

        <p className="mt-5 flex items-center gap-2 label-tag text-primary">
          <WandSparkles className="size-4" /> Wardrobe stylist
        </p>
        <p className="mt-1.5 text-[17px] leading-relaxed">
          Effortless combinations tailored to your schedule, the weather and what you actually own.
        </p>

        {anchor && anchorOn && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft/50 p-2.5 pr-3">
            <GarmentImage src={anchor.image_url} alt={anchor.name} className="size-12 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="label-micro text-primary-deep">Building around</p>
              <p className="truncate text-sm font-semibold">{anchor.name}</p>
            </div>
            <button type="button" aria-label="Remove" onClick={() => setAnchorOn(false)} className="text-muted-foreground">
              <X className="size-5" />
            </button>
          </div>
        )}

        <label htmlFor="occasion-text" className="mt-6 block text-[17px] font-medium">
          What is the occasion or event?
        </label>
        <div className="mt-3 flex gap-3 rounded-2xl border border-border bg-card p-4 focus-within:border-primary">
          <NotebookPen className="mt-0.5 size-5 shrink-0 text-primary" />
          <textarea
            id="occasion-text"
            rows={2}
            value={q}
            maxLength={120}
            onChange={(e) => {
              setQ(e.target.value);
              setManual(null);
            }}
            placeholder="Describe the occasion (e.g. formal dinner, college fest, autumn brunch)"
            className="min-w-0 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 no-scrollbar">
          {QUICK.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setQ(label);
                setManual(null);
              }}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium",
                q === label ? "border-primary bg-primary-soft text-primary-deep" : "border-border bg-muted text-foreground",
              )}
            >
              <Icon className="size-4 text-primary" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[15px] font-medium">Dress code</p>
          {q && !manual && <p className="text-xs text-muted-foreground">Read from your description</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setManual(o)}>
              {OCCASION_LABEL[o]}
            </Chip>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <p className="text-[17px] font-medium">
            For which day? <span className="text-sm text-muted-foreground">({prettyDate(date, "EEE, MMM d")})</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setPickerMonth(monthOf(date));
              setPickerOpen((v) => !v);
            }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-deep"
          >
            Pick a date <ArrowUpRight className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 rounded-2xl bg-muted p-1.5">
          {week.map((d) => {
            const sel = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                aria-pressed={sel}
                className={cn(
                  "flex flex-col items-center rounded-xl py-2.5 transition-colors",
                  sel ? "bg-primary text-primary-foreground shadow-lift" : "text-foreground hover:bg-card",
                )}
              >
                <span className={cn("text-[11px] font-medium uppercase", !sel && "text-muted-foreground")}>
                  {format(fromISODate(d), "EEE")}
                </span>
                <span className="mt-0.5 text-lg font-semibold">{format(fromISODate(d), "d")}</span>
              </button>
            );
          })}
        </div>
        {pickerOpen && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <button type="button" aria-label="Previous month" onClick={() => setPickerMonth((m) => addMonths(m, -1))} className="grid size-8 place-items-center rounded-full hover:bg-muted">
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-semibold">{format(pickerMonth, "MMMM yyyy")}</p>
              <button type="button" aria-label="Next month" onClick={() => setPickerMonth((m) => addMonths(m, 1))} className="grid size-8 place-items-center rounded-full hover:bg-muted">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <MonthGrid
              month={pickerMonth}
              selected={date}
              today={today}
              disablePast
              size="sm"
              onSelect={(d) => {
                setDate(d);
                setPickerOpen(false);
              }}
            />
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rose/40 text-primary-deep">
            <History className="size-5" />
          </span>
          <label htmlFor="avoid" className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Avoid recently worn outfits</p>
            <p className="text-sm text-muted-foreground">
              Exclude pieces worn within the last {RECENT_WINDOW_DAYS} days
            </p>
          </label>
          <Switch id="avoid" checked={avoid} onCheckedChange={setAvoid} />
        </div>

        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-muted p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <WeatherIcon code={day?.code} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-micro text-muted-foreground">Forecast context · {place.label}</p>
            <p className="text-[15px] font-semibold">
              {day ? `${day.max}°C, ${describeWeather(day.code).label}` : forecast.isLoading ? "Checking forecast…" : "Forecast not available yet"}
            </p>
          </div>
          {day && (
            <span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
              Layers: {layerAdvice(day.max).layers}
            </span>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="label-micro text-muted-foreground">Style inspiration</p>
            {preview && <p className="text-sm font-medium text-primary-deep">Capsule match {preview.score}%</p>}
          </div>
          {preview ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {preview.garmentIds.slice(0, 3).map((id) => {
                const g = garmentById(state, id);
                if (!g) return null;
                return (
                  <div key={id} className="relative overflow-hidden rounded-xl bg-muted">
                    <GarmentImage src={g.image_url} alt={g.name} className="aspect-[3/4] w-full" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-card/90 px-1.5 py-0.5 text-[11px]">
                      {CATEGORY_SINGULAR[g.category]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No complete {OCCASION_LABEL[occasion].toLowerCase()} look yet with these settings — try turning off "avoid
              recently worn" or tag more pieces for this occasion.
            </p>
          )}
        </div>

        <Button size="xl" className="mt-6 w-full shadow-lift" onClick={go}>
          <WandSparkles /> Suggest Outfits
        </Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Built only from pieces in your wardrobe
        </p>
      </div>
    </Screen>
  );
}
