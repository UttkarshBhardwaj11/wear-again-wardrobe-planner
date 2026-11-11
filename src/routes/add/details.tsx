import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, CircleX, Palette, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Chip } from "@/components/mobi/Chip";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { HangerIcon } from "@/components/mobi/Hanger";
import { Screen } from "@/components/mobi/Screen";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHydrated } from "@/hooks/use-hydrated";
import { PRIMARY_SWATCH_COUNT, SWATCHES } from "@/lib/wardrobe/colors";
import { activeGarments, garmentById, occasionsFor } from "@/lib/wardrobe/derive";
import { clearDraft, readDraft } from "@/lib/wardrobe/draft";
import { processPhoto } from "@/lib/wardrobe/photo";
import { addGarment, StorageFullError, updateGarment, useWardrobe } from "@/lib/wardrobe/store";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  OCCASION_LABEL,
  OCCASIONS,
  type Category,
  type Occasion,
} from "@/lib/wardrobe/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/add/details")({
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s.edit === "string" && s.edit ? { edit: s.edit } : {},
  head: () => ({
    meta: [
      { title: "Item details — Mobidrobe" },
      { name: "description", content: "Name your piece, pick its colour and category, and tag the occasions it suits." },
      { property: "og:title", content: "Item details — Mobidrobe" },
      { property: "og:description", content: "Name your piece, pick its colour and category, and tag the occasions it suits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ItemDetailsForm,
});

const CATEGORY_HINT: Record<Category, string> = {
  TOPS: "Tops & Knitwear",
  BOTTOMS: "Trousers, Denim & Skirts",
  FOOTWEAR: "Shoes & Boots",
  ETHNIC: "Kurtas, Sarees & Lehengas",
  OUTERWEAR: "Coats, Jackets & Blazers",
};

interface FormState {
  image_url: string;
  source_url?: string;
  name: string;
  brand: string;
  color: string;
  category: Category | "";
  occasions: Occasion[];
}

function ItemDetailsForm() {
  const { edit } = Route.useSearch();
  const state = useWardrobe();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [showAllColors, setShowAllColors] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!hydrated || form) return;
    if (edit) {
      const g = garmentById(state, edit);
      if (!g) return setMissing(true);
      setForm({
        image_url: g.image_url,
        source_url: g.source_url,
        name: g.name,
        brand: g.brand ?? "",
        color: g.color,
        category: g.category,
        occasions: occasionsFor(state, g.id),
      });
      return;
    }
    const d = readDraft();
    if (!d) return setMissing(true);
    setForm({
      image_url: d.image_url,
      source_url: d.source_url,
      name: d.name ?? "",
      brand: d.brand ?? "",
      color: d.color ?? "Ivory",
      category: d.category ?? "",
      occasions: d.occasions ?? [],
    });
  }, [hydrated, edit, state, form]);

  const compat = useMemo(() => {
    if (!form?.category || !form.occasions.length) return 0;
    return activeGarments(state).filter(
      (g) =>
        g.id !== edit &&
        g.category !== form.category &&
        !(form.category === "ETHNIC" && g.category !== "FOOTWEAR") &&
        !(g.category === "ETHNIC" && form.category !== "FOOTWEAR") &&
        occasionsFor(state, g.id).some((o) => form.occasions.includes(o)),
    ).length;
  }, [form, state, edit]);

  if (missing) {
    return (
      <Screen nav={false}>
        <AppHeader back title="Item Details" />
        <div className="px-6 pt-16 text-center">
          <p className="font-display text-2xl">Nothing to tag yet</p>
          <p className="mt-2 text-muted-foreground">Start by adding a photo or a product link.</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/add">Add an item</Link>
          </Button>
        </div>
      </Screen>
    );
  }

  if (!form) {
    return (
      <Screen nav={false}>
        <AppHeader back title="Item Details" />
        <div className="mx-5 mt-5 aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const toggleOcc = (o: Occasion) =>
    set("occasions", form.occasions.includes(o) ? form.occasions.filter((x) => x !== o) : [...form.occasions, o]);

  const errors = {
    name: !form.name.trim() ? "Give this piece a name" : null,
    category: !form.category ? "Choose a category" : null,
    occasions: form.occasions.length === 0 ? "Pick at least one occasion" : null,
  };
  const valid = !errors.name && !errors.category && !errors.occasions;

  const swatches = showAllColors ? SWATCHES : SWATCHES.slice(0, PRIMARY_SWATCH_COUNT);
  const colorInList = swatches.some((s) => s.name === form.color);
  const visibleSwatches = colorInList ? swatches : [...swatches, SWATCHES.find((s) => s.name === form.color)!].filter(Boolean);

  const onSave = () => {
    setSubmitted(true);
    if (!valid || !form.category) return;
    const input = {
      category: form.category,
      name: form.name.trim(),
      color: form.color,
      image_url: form.image_url,
      source_url: form.source_url,
      brand: form.brand.trim() || undefined,
      occasions: form.occasions,
    };
    try {
      if (edit) {
        updateGarment(edit, input);
        toast.success("Changes saved");
        navigate({ to: "/item/$id", params: { id: edit }, replace: true });
      } else {
        const id = addGarment(input);
        clearDraft();
        toast.success(`${input.name} joined your wardrobe`);
        navigate({ to: "/item/$id", params: { id }, replace: true });
      }
    } catch (e) {
      toast.error(e instanceof StorageFullError ? e.message : "Couldn't save this item. Please try again.");
    }
  };

  return (
    <Screen nav={false}>
      <AppHeader back title={edit ? "Edit Item" : "Item Details"} />
      <div className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <GarmentImage src={form.image_url} alt={form.name || "New garment"} eager className="aspect-[4/3] w-full" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 label-micro backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" /> {edit ? "Editing" : "Auto-tagged"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const { dataUrl, color } = await processPhoto(f);
                setForm((cur) => (cur ? { ...cur, image_url: dataUrl, color } : cur));
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full bg-card/95 px-4 text-sm font-medium shadow-sm"
          >
            <Camera className="size-4 text-primary" /> Replace
          </button>
        </div>

        <Field label="Item name" htmlFor="item-name" error={submitted ? errors.name : null}>
          <div className="flex h-14 items-center rounded-2xl border border-border bg-card px-4 focus-within:border-primary">
            <input
              id="item-name"
              value={form.name}
              maxLength={60}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Oversized Terracotta Knit"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {form.name && (
              <button type="button" aria-label="Clear name" onClick={() => set("name", "")} className="text-muted-foreground">
                <CircleX className="size-5" />
              </button>
            )}
          </div>
        </Field>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <p className="label-tag text-foreground">Primary colour</p>
            <p className="text-sm font-medium text-primary-deep">{form.color}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Primary colour">
            {visibleSwatches.map((s) => (
              <button
                key={s.name}
                type="button"
                role="radio"
                aria-checked={form.color === s.name}
                aria-label={s.name}
                onClick={() => set("color", s.name)}
                className={cn(
                  "size-11 rounded-full border border-border transition-transform",
                  form.color === s.name && "scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: s.hex }}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowAllColors((v) => !v)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground"
            >
              <Palette className="size-4" /> {showAllColors ? "Less" : "+ More"}
            </button>
          </div>
        </div>

        <Field label="Category" error={submitted ? errors.category : null}>
          <Select value={form.category} onValueChange={(v) => set("category", v as Category)}>
            <SelectTrigger className="h-14 rounded-2xl border-border bg-card px-4 text-base shadow-none">
              <span className="flex items-center gap-3">
                <HangerIcon className="size-5 text-primary" />
                <SelectValue placeholder="Choose a category" />
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="py-2.5">
                  {CATEGORY_LABEL[c]} <span className="text-muted-foreground">· {CATEGORY_HINT[c]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Occasions (select multiple)" error={submitted ? errors.occasions : null}>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <Chip key={o} active={form.occasions.includes(o)} onClick={() => toggleOcc(o)} className="h-11 px-5">
                {OCCASION_LABEL[o]}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Brand" htmlFor="brand" hint="Optional">
          <input
            id="brand"
            value={form.brand}
            maxLength={40}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="e.g. Fabindia"
            className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </Field>

        {form.source_url && (
          <p className="mt-3 truncate text-xs text-muted-foreground">
            Imported from{" "}
            <a href={form.source_url} target="_blank" rel="noreferrer" className="text-primary-deep underline">
              {new URL(form.source_url).hostname.replace(/^www\./, "")}
            </a>
          </p>
        )}

        {compat > 0 && (
          <div className="mt-7 flex gap-3 rounded-2xl bg-rose/25 p-4">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary-deep" />
            <div>
              <p className="text-[15px] font-semibold">Capsule Compatibility</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Pairs with {compat} {compat === 1 ? "piece" : "pieces"} already in your wardrobe for{" "}
                {form.occasions.map((o) => OCCASION_LABEL[o].toLowerCase()).join(" & ")} looks.
              </p>
            </div>
          </div>
        )}

        <Button size="xl" className="mt-8 w-full shadow-lift" onClick={onSave}>
          <HangerIcon className="size-5" /> {edit ? "Save Changes" : "Save to Wardrobe"}
        </Button>
      </div>
    </Screen>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor={htmlFor} className="label-tag text-foreground">
          {label}
        </label>
        {hint && <span className="label-micro text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
