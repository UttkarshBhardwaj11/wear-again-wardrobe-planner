import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fromISODate, toISODate } from "@/lib/wardrobe/dates";
import { cn } from "@/lib/utils";

export type DayMark = "upcoming" | "past";

export function MonthGrid({
  month,
  selected,
  today,
  marks,
  onSelect,
  disablePast,
  size = "md",
}: {
  month: Date;
  selected: string | null;
  today: string;
  marks?: Record<string, DayMark>;
  onSelect: (date: string) => void;
  disablePast?: boolean;
  size?: "sm" | "md";
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const heads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div role="grid" aria-label={format(month, "MMMM yyyy")}>
      <div className="grid grid-cols-7 pb-2" role="row">
        {heads.map((h) => (
          <div key={h} role="columnheader" className="text-center text-xs font-medium tracking-wide text-muted-foreground">
            {size === "sm" ? h[0] : h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const iso = toISODate(d);
          const inMonth = isSameMonth(d, month);
          const isSel = iso === selected;
          const isToday = iso === today;
          const mark = marks?.[iso];
          const disabled = !inMonth || (disablePast && iso < today);
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${format(d, "EEEE, MMMM d")}${mark ? (mark === "past" ? ", outfit worn" : ", outfit planned") : ""}`}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "relative mx-auto grid place-items-center rounded-full text-[15px] transition-colors",
                size === "sm" ? "size-10" : "size-11",
                !inMonth && "text-muted-foreground/40",
                inMonth && disabled && "text-muted-foreground/50",
                inMonth && !disabled && !isSel && "hover:bg-muted",
                isToday && !isSel && "font-semibold text-primary",
                isSel && "bg-primary font-semibold text-primary-foreground",
              )}
            >
              {format(d, "d")}
              {mark && inMonth && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1.5 rounded-full",
                    isSel ? "bg-primary-foreground" : mark === "upcoming" ? "bg-primary" : "bg-foreground/35",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function monthOf(iso: string): Date {
  return startOfMonth(fromISODate(iso));
}
