import { addMonths, format } from "date-fns";
import { CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { prettyDate, todayISO } from "@/lib/wardrobe/dates";
import { useWardrobe } from "@/lib/wardrobe/store";
import type { Garment } from "@/lib/wardrobe/types";
import { BottomSheet } from "./BottomSheet";
import { GarmentImage } from "./GarmentImage";
import { MonthGrid, monthOf, type DayMark } from "./MonthGrid";

export function LockOutfitSheet({
  open,
  onOpenChange,
  outfitTitle,
  garments,
  defaultDate,
  defaultEvent,
  ignorePlanId,
  mode = "lock",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  outfitTitle: string;
  garments: Garment[];
  defaultDate: string;
  defaultEvent: string;
  ignorePlanId?: string;
  mode?: "lock" | "edit";
  onConfirm: (v: { event_name: string; plan_date: string }) => void;
}) {
  const state = useWardrobe();
  const today = todayISO();
  const [date, setDate] = useState(defaultDate);
  const [month, setMonth] = useState(() => monthOf(defaultDate));
  const [event, setEvent] = useState(defaultEvent);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setMonth(monthOf(defaultDate));
      setEvent(defaultEvent);
      setTouched(false);
    }
  }, [open, defaultDate, defaultEvent]);

  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const p of state.calendarPlans) {
      if (p.id === ignorePlanId) continue;
      m[p.plan_date] = p.plan_date < today ? "past" : "upcoming";
    }
    return m;
  }, [state.calendarPlans, today, ignorePlanId]);

  const sameDay = state.calendarPlans.filter((p) => p.plan_date === date && p.id !== ignorePlanId);
  const eventError = touched && !event.trim() ? "Give this event a name" : null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "lock" ? "Save This Outfit" : "Edit This Plan"}
      eyebrow="Calendar lock"
    >
      <div className="rounded-2xl bg-muted p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-semibold">{outfitTitle}</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose/30 px-2.5 py-1 text-xs font-medium">
            <CircleCheck className="size-3.5" /> {garments.length} Pieces
          </span>
        </div>
        <div className="mt-3 flex gap-2.5 overflow-x-auto no-scrollbar">
          {garments.map((g) => (
            <GarmentImage
              key={g.id}
              src={g.image_url}
              alt={g.name}
              className="aspect-square w-[72px] shrink-0 rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[15px] font-semibold">Select Date</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-28 text-center text-sm font-medium tracking-wide text-primary-deep">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-muted p-3">
        <MonthGrid month={month} selected={date} today={today} marks={marks} onSelect={setDate} size="sm" />
      </div>
      {sameDay.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Also on {prettyDate(date)}: {sameDay.map((p) => p.event_name).join(", ")}
        </p>
      )}

      <label htmlFor="event-name" className="mt-6 block text-[15px] font-semibold">
        Event Details
      </label>
      <div className="mt-3 flex h-14 items-center gap-3 rounded-2xl border border-transparent bg-muted px-4 focus-within:border-primary">
        <UtensilsCrossed className="size-5 shrink-0 text-muted-foreground" />
        <input
          id="event-name"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={80}
          placeholder="e.g. Client dinner @ Cecconi's"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      {eventError && <p className="mt-1.5 text-xs text-destructive">{eventError}</p>}

      <Button
        size="xl"
        className="mt-6 w-full shadow-lift"
        onClick={() => {
          setTouched(true);
          if (!event.trim()) return;
          onConfirm({ event_name: event.trim(), plan_date: date });
        }}
      >
        <CalendarCheck /> {mode === "lock" ? "Confirm & Save" : "Save Changes"}
      </Button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="mt-3 w-full py-2 text-sm font-semibold tracking-wide text-muted-foreground"
      >
        Cancel
      </button>
    </BottomSheet>
  );
}
