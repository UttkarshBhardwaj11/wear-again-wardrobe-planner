import { Shirt } from "lucide-react";
import { useState } from "react";
import { resolveImage } from "@/lib/wardrobe/images";
import { cn } from "@/lib/utils";

export function GarmentImage({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = resolveImage(src);
  if (!url || failed) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)} role="img" aria-label={alt}>
        <Shirt className="size-8" strokeWidth={1.2} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      width={768}
      height={1024}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
