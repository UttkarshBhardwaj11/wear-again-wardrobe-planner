import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Chip, Tag } from "@/components/mobi/Chip";
import { GarmentCard } from "@/components/mobi/GarmentCard";
import { Screen } from "@/components/mobi/Screen";
import { WeatherIcon } from "@/components/mobi/WeatherIcon";
import { useHydrated } from "@/hooks/use-hydrated";
import { daysBetween, prettyDate, relativeDayLabel, todayISO } from "@/lib/wardrobe/dates";
import { activeGarments, occasionsFor, plansOn, wearStats } from "@/lib/wardrobe/derive";
import { useWardrobe } from "@/lib/wardrobe/store";
import { suggestOutfits } from "@/lib/wardrobe/suggest";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/wardrobe/types";
import { describeWeather, layerAdvice, useForecast, usePlace } from "@/lib/weather";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — Mobidrobe" },
      { name: "description", content: "Your rotation at a glance: today's styling prompt, upcoming plans and your curated rack." },
      { property: "og:title", content: "Home — Mobidrobe" },
      { property: "og:description", content: "Your rotation at a glance: today's styling prompt, upcoming plans and your curated rack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function seasonTag(): string {
  const m = new Date().getMonth();
  const yy = String(new Date().getFullYear()).slice(2);
  const season = m <= 1 || m === 11 ? "Winter" : m <= 4 ? "Spring" : m <= 7 ? "Summer" : "Autumn";
  return `${season} '${yy}`;
}

function Home() {
  const state = useWardrobe();
  const hydrated = useHydrated();
  const today = todayISO();
  const [filter, setFilter] = useState<Category | "ALL">("ALL");
  const { place, locateMe } = usePlace();
  const forecast = useForecast(place);

  const garments = activeGarments(state);
  const shown = useMemo(
    () =>
      garments
        .filter((g) => filter === "ALL" || g.category === filter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [garments, filter],
  );

  const upcoming = state.calendarPlans
    .filter((p) => p.plan_date >= today)
    .sort((a, b) => a.plan_date.localeCompare(b.plan_date));
  const wornThisMonth = state.calendarPlans.filter(
    (p) => p.plan_date < today && daysBetween(p.plan_date, today) <= 30,
  ).length;

  const todayPlan = plansOn(state, today)[0];
  const quickPick = useMemo(
    () => suggestOutfits(state, { occasion: "CASUAL", targetDate: today, avoidRecent: true }).suggestions[0],
    [state, today],
  );
  const pickNames = quickPick?.garmentIds
    .slice(0, 2)
    .map((id) => state.garments.find((g) => g.id === id)?.name.split(" ").slice(-1)[0])
    .join(" + ");

  const wx = forecast.data;
  const advice = wx ? layerAdvice(wx.days[0]?.max ?? wx.current.temp) : null;
  const name = hydrated ? state.profile?.name : "";

  return (
    <Screen>
      <AppHeader />
      <section className="px-5 pt-6">
        <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-[15px] text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" /> {garments.length} items in rotation
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-muted p-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <WeatherIcon code={wx?.current.code} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">
              {wx ? `${wx.current.temp}°C · ${describeWeather(wx.current.code).label}` : forecast.isError ? "Today's styling" : "Checking the sky…"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {todayPlan
                ? `Today: ${todayPlan.plan.event_name}`
                : pickNames
                  ? `${pickNames} works today${advice ? ` · ${advice.tip.toLowerCase()}` : ""}`
                  : "Add a few pieces to get daily picks"}
            </p>
          </div>
          <Link
            to="/style"
            search={{ date: today }}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-primary-deep"
          >
            Style <ArrowRight className="size-4" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() =>
            locateMe()
              .then(() => toast.success("Weather now uses your location"))
              .catch((e: Error) => toast.error(e.message))
          }
          className="mt-2 inline-flex items-center gap-1 px-1 text-xs text-muted-foreground"
        >
          <MapPin className="size-3" /> {place.label} · use my location
        </button>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Stat value={garments.length} label="Pieces" />
          <Stat value={upcoming.length} label="Looks planned" />
          <Stat value={wornThisMonth} label="Worn · 30 days" />
        </div>

        {upcoming[0] && (
          <Link
            to="/calendar"
            search={{ date: upcoming[0].plan_date }}
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="label-micro text-primary">Next up · {relativeDayLabel(upcoming[0].plan_date, today)}</p>
              <p className="truncate text-[15px] font-semibold">{upcoming[0].event_name}</p>
              <p className="text-xs text-muted-foreground">{prettyDate(upcoming[0].plan_date, "EEEE, MMM d")}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto px-5 no-scrollbar" role="toolbar" aria-label="Filter by category">
        <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>

      <section className="px-5 pt-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-[26px] font-medium">Curated Rack</h2>
            <Tag>{seasonTag()}</Tag>
          </div>
          <Link to="/wardrobe" className="text-sm font-medium text-primary-deep">
            View all
          </Link>
        </div>
        {shown.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-primary/40 p-8 text-center">
            <p className="font-display text-xl">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "ALL" ? "Add your first piece to start your wardrobe." : `No ${CATEGORY_LABEL[filter as Category].toLowerCase()} yet.`}
            </p>
            <Link to="/add" className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Add an item
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {shown.map((g, i) => (
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <p className="font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1.5 label-micro text-muted-foreground">{label}</p>
    </div>
  );
}
