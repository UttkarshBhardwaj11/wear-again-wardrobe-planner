import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 linen-scrim" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[28px] border border-border bg-card shadow-ambient outline-none"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <div className="flex items-start justify-between gap-4 px-6 pt-4">
            <div>
              <DrawerPrimitive.Title className="font-display text-[28px] font-semibold leading-tight">
                {title}
              </DrawerPrimitive.Title>
              {eyebrow && <p className="mt-0.5 label-tag text-muted-foreground">{eyebrow}</p>}
            </div>
            <DrawerPrimitive.Close
              aria-label="Close"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground"
            >
              <X className="size-5" />
            </DrawerPrimitive.Close>
          </div>
          <div className="overflow-y-auto px-6 pb-8 pt-5">{children}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
