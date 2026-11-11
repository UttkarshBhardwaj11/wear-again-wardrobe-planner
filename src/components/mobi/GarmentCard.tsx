import { Link } from "@tanstack/react-router";
import { swatchFor } from "@/lib/wardrobe/colors";
import { CATEGORY_LABEL, OCCASION_LABEL, type Garment, type Occasion } from "@/lib/wardrobe/types";
import { GarmentImage } from "./GarmentImage";

export function ColorDot({ color, className = "size-3" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border border-border ${className}`}
      style={{ backgroundColor: swatchFor(color).hex }}
    />
  );
}

export function GarmentCard({
  garment,
  occasions,
  wornCount,
  eager,
}: {
  garment: Garment;
  occasions: Occasion[];
  wornCount: number;
  eager?: boolean;
}) {
  const tag = [occasions[0] ? OCCASION_LABEL[occasions[0]] : null, CATEGORY_LABEL[garment.category]]
    .filter(Boolean)
    .join(" / ");
  return (
    <Link
      to="/item/$id"
      params={{ id: garment.id }}
      className="group flex flex-col rounded-2xl border border-border bg-card p-2.5 transition-shadow hover:shadow-ambient"
    >
      <div className="relative overflow-hidden rounded-xl bg-background">
        <GarmentImage
          src={garment.image_url}
          alt={garment.name}
          eager={eager}
          className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-rose/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground backdrop-blur">
          {tag}
        </span>
      </div>
      <div className="px-1 pt-2.5">
        <div className="flex items-center gap-1.5">
          <ColorDot color={garment.color} />
          <p className="truncate text-[13px] font-semibold tracking-wide">{garment.name}</p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{garment.brand || garment.color}</p>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
            {wornCount ? `Worn ${wornCount}×` : "New"}
          </span>
        </div>
      </div>
    </Link>
  );
}
