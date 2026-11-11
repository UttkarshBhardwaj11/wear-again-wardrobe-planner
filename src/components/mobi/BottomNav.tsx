import { Link } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, Plus, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import { HangerIcon } from "./Hanger";

function Tab({ to, label, icon }: { to: "/home" | "/wardrobe" | "/calendar" | "/style"; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium tracking-wide text-muted-foreground transition-colors data-[status=active]:text-primary"
      activeOptions={{ exact: false }}
    >
      {icon}
      {label}
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-background/95 pb-safe backdrop-blur"
    >
      <div className="flex items-end px-2 pt-1">
        <Tab to="/home" label="Home" icon={<LayoutGrid className="size-6" strokeWidth={1.6} />} />
        <Tab to="/wardrobe" label="Wardrobe" icon={<HangerIcon />} />
        <div className="flex flex-1 justify-center">
          <Link
            to="/add"
            aria-label="Add item"
            className="-mt-7 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform active:scale-95 active:bg-primary-deep"
          >
            <Plus className="size-7" strokeWidth={2} />
          </Link>
        </div>
        <Tab to="/calendar" label="Calendar" icon={<CalendarDays className="size-6" strokeWidth={1.6} />} />
        <Tab to="/style" label="Styling" icon={<WandSparkles className="size-6" strokeWidth={1.6} />} />
      </div>
    </nav>
  );
}
