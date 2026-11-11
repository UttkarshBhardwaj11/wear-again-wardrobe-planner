import { cn } from "@/lib/utils";

export function HangerIcon({ className, strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <path d="M12 7.2a2.2 2.2 0 1 0-2.2-2.2" />
      <path d="M12 7.2v1.6" />
      <path d="M12 8.8 2.8 15.6a1.3 1.3 0 0 0 .8 2.4h16.8a1.3 1.3 0 0 0 .8-2.4L12 8.8Z" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)}>
      <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
        <HangerIcon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="font-display text-[22px] font-semibold tracking-tight">Mobidrobe</span>
    </span>
  );
}
