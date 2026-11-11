import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

export function Screen({
  children,
  nav = true,
  className,
}: {
  children: ReactNode;
  nav?: boolean;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-secondary/60">
      <div
        className={cn(
          "relative mx-auto min-h-dvh w-full max-w-md bg-background md:shadow-ambient",
          nav ? "pb-28" : "pb-8",
          className,
        )}
      >
        {children}
        {nav && <BottomNav />}
      </div>
    </div>
  );
}
