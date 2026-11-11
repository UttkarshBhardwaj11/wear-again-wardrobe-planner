import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  active,
  check,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; check?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {check && active && <Check className="size-4" />}
      {children}
    </button>
  );
}

export function Tag({ children, className, tone = "rose" }: { children: React.ReactNode; className?: string; tone?: "rose" | "stone" | "peach" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 label-tag",
        tone === "rose" && "bg-rose/25 text-foreground",
        tone === "stone" && "bg-muted text-muted-foreground",
        tone === "peach" && "bg-primary-soft text-primary-deep",
        className,
      )}
    >
      {children}
    </span>
  );
}
