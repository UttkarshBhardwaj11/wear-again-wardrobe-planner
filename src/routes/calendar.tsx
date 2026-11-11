import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { addDays, addMonths, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Tag } from "@/components/mobi/Chip";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { LockOutfitSheet } from "@/components/mobi/LockOutfitSheet";
import { MonthGrid, monthOf, type DayMark } from "@/components/mobi/MonthGrid";
import { Screen } from "@/components/mobi/Screen";
import { fromISODate, prettyDate, toISODate, todayISO } from "@/lib/wardrobe/dates";
import { plansOn, type PlanView } from "@/lib/wardrobe/derive";
import { removePlan, restorePlan, updatePlan, useWardrobe } from "@/lib/wardrobe/store";
import { OCCASION_LABEL } from "@/lib/wardrobe/types";
import { cn } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/calendar")({
  validateSearch: (s: Record<string, unknown>): { date?: string } =>
    typeof s.date === "string" && ISO.test(s.date) ? { date: s.date } : {},
  head: () => ({
    meta: [
      { title: "Outfit calendar — Mobidrobe" },
      { name: "description", content: "See planned outfits and your wear history by month or week." },
      { property: "og:title", content: "Outfit calendar — Mobidrobe" },
      { property: "og:description", content: "See planned outfits and your wear history by month or week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const state = useWardrobe();
  const today = todayISO();
  const selected = search.date ?? today;
  const [month, setMonth] = useState(() => monthOf(selected));
  const [view, setView] = useState<"month" | "week">("month");
  const [editing, setEditing] = useState<PlanView | null>(null);

  const select = (d: string) => navigate({ to: "/calendar", search: { date: d }, replace: true });

  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const p of state.calendarPlans) m[p.plan_date] = p.plan_date < today ? "past" : "upcoming";
    return m;
  }, [state.calendarPlans, today]);

  const dayPlans = plansOn(state, selected);
  const weekStart = startOfWeek(fromISODate(selected), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));

  const onRemove = (pv: PlanView) => {
    removePlan(pv.plan.id);
    toast(`Removed ${pv.plan.event_name}`, { action: { label: "Undo", onClick: () => restorePlan(pv.plan) } });
  };

  return (
    <Screen>
      <AppHeader />
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous" onClick={() => (view === "month" ? setMonth((m) => addMonths(m, -1)) : select(toISODate(addDays(weekStart, -7))))} className="grid size-9 place-items-center rounded-full hover:bg-muted">
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="min-w-32 text-center font-display text-[26px] font-medium leading-tight">
              {format(view === "month" ? month : weekStart, "MMM yyyy")}
            </h1>
            <button type="button" aria-label="Next" onClick={() => (view === "month" ? setMonth((m) => addMonths(m, 1)) : select(toISODate(addDays(weekStart, 7))))} className="grid size-9 place-items-center rounded-full hover:bg-muted">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <button type="button" onClick={() => { setMonth(monthOf(today)); select(today); }} className="h-9 rounded-full bg-muted px-3 text-sm font-medium">
            Today
          </button>
        </div>
        <div className="mt-3 flex w-fit rounded-full border border-border bg-muted p-1 text-sm">
          {(["month", "week"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-full px-4 py-1.5 font-medium capitalize", view === v ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground")}>
              {v}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          {view === "month" ? (
            <MonthGrid month={month} selected={selected} today={today} marks={marks} onSelect={select} />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => {
                const first = plansOn(state, d)[0];
                const sel = d === selected;
                return (
                  <button key={d} type="button" onClick={() => select(d)} className={cn("flex flex-col items-center rounded-xl p-1 pb-2", sel ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    <span className="text-[11px] uppercase">{format(fromISODate(d), "EEE")}</span>
                    <span className="text-base font-semibold">{format(fromISODate(d), "d")}</span>
                    {first?.garments[0] ? (
                      <GarmentImage src={first.garments[0].image_url} alt={first.plan.event_name} className={cn("mt-1 aspect-[3/4] w-full rounded-lg", d < today && "opacity-70")} />
                    ) : (
                      <span className="mt-1 aspect-[3/4] w-full rounded-lg border border-dashed border-border" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary" /> Planned</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-foreground/35" /> Worn</span>
        </p>

        <div className="mt-6 flex items-center gap-2">
          <p className="label-tag text-primary-deep">{prettyDate(selected, "EEEE, MMM d")}</p>
          <span className="text-sm text-muted-foreground">
            · {dayPlans.length ? `${dayPlans.length} ${dayPlans.length === 1 ? "look" : "looks"} ${selected < today ? "worn" : "planned"}` : "Nothing planned"}
          </span>
        </div>

        <div className="mt-3 space-y-4">
          {dayPlans.map((pv) => (
            <article key={pv.plan.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{pv.plan.event_name}</h2>
                  <p className="text-sm text-muted-foreground">{pv.outfit?.name ?? "Saved look"}</p>
                </div>
                <Tag>{selected < today ? "Worn" : pv.outfit ? OCCASION_LABEL[pv.outfit.occasion] : "Look"}</Tag>
              </div>
              <p className="mt-4 label-tag text-muted-foreground">Garments ({pv.garments.length})</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {pv.garments.map((g) => (
                  <Link key={g.id} to="/item/$id" params={{ id: g.id }} className="min-w-0">
                    <GarmentImage src={g.image_url} alt={g.name} className="aspect-square w-full rounded-xl border border-border" />
                    <p className="mt-1 truncate text-[11px]">{g.name}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setEditing(pv)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-muted text-[15px] font-medium">
                  <Pencil className="size-4" /> Edit Look
                </button>
                <button type="button" onClick={() => onRemove(pv)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-destructive/10 px-5 text-[15px] font-medium text-destructive">
                  <Trash2 className="size-4" /> Remove
                </button>
              </div>
            </article>
          ))}
          {dayPlans.length === 0 && selected >= today && (
            <Link to="/style" search={{ date: selected }} className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-primary/40 p-6 text-[15px] font-medium text-primary-deep">
              <Plus className="size-4" /> Plan an outfit for this day
            </Link>
          )}
        </div>
      </div>

      <Link to="/style" search={{ date: selected >= today ? selected : today }} aria-label="Plan an outfit" className="fixed bottom-28 right-[max(1.25rem,calc(50%-14rem+1.25rem))] z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift">
        <Plus className="size-6" />
      </Link>

      {editing && (
        <LockOutfitSheet
          open={!!editing}
          mode="edit"
          onOpenChange={(o) => !o && setEditing(null)}
          outfitTitle={editing.outfit?.name ?? "Saved look"}
          garments={editing.garments}
          defaultDate={editing.plan.plan_date}
          defaultEvent={editing.plan.event_name}
          ignorePlanId={editing.plan.id}
          onConfirm={(v) => {
            updatePlan(editing.plan.id, v);
            setEditing(null);
            toast.success("Plan updated");
            setMonth(monthOf(v.plan_date));
            select(v.plan_date);
          }}
        />
      )}
    </Screen>
  );
}
