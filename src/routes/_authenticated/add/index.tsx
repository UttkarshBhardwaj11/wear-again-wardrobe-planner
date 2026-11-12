import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Camera, ClipboardPaste, ImagePlus, Link2, Loader2, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { Chip } from "@/components/mobi/Chip";
import { Screen } from "@/components/mobi/Screen";
import { Button } from "@/components/ui/button";
import { importProductLink } from "@/lib/product-link.functions";
import { categoryFromText } from "@/lib/wardrobe/classify";
import { colorFromText } from "@/lib/wardrobe/colors";
import { saveDraft, type GarmentDraft } from "@/lib/wardrobe/draft";
import { processPhoto } from "@/lib/wardrobe/photo";
import { OCCASION_LABEL, OCCASIONS, type Occasion } from "@/lib/wardrobe/types";

export const Route = createFileRoute("/_authenticated/add/")({
  head: () => ({
    meta: [
      { title: "Add an item — Mobidrobe" },
      { name: "description", content: "Upload a photo or paste a product link to add a garment to your wardrobe." },
      { property: "og:title", content: "Add an item — Mobidrobe" },
      { property: "og:description", content: "Upload a photo or paste a product link to add a garment to your wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AddItem,
});

function AddItem() {
  const navigate = useNavigate();
  const router = useRouter();
  const importLink = useServerFn(importProductLink);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Omit<GarmentDraft, "occasions"> | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"photo" | "link" | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy("photo");
    try {
      const { dataUrl, color } = await processPhoto(file);
      setDraft({ image_url: dataUrl, color });
      setLinkError(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    if (!url.trim()) return;
    setBusy("link");
    setLinkError(null);
    try {
      const res = await importLink({ data: { url: url.trim() } });
      if (!res.ok || !res.image_url) {
        setLinkError(res.error ?? "We couldn't import that link.");
        return;
      }
      const text = `${res.title ?? ""} ${url}`;
      setDraft({
        image_url: res.image_url,
        source_url: res.source_url,
        name: res.title,
        brand: res.brand,
        color: colorFromText(text) ?? undefined,
        category: categoryFromText(text) ?? undefined,
      });
    } catch {
      setLinkError("We couldn't reach that link. Try again, or upload a photo.");
    } finally {
      setBusy(null);
    }
  };

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      toast("Long-press the field to paste your link");
    }
  };

  const toggle = (o: Occasion) =>
    setOccasions((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));

  const onContinue = () => {
    if (!draft) return;
    if (!saveDraft({ ...draft, occasions })) {
      toast.error("That photo is too large to hold. Try a smaller one.");
      return;
    }
    navigate({ to: "/add/details" });
  };

  return (
    <Screen nav={false} className="bg-secondary">
      <AppHeader back title="Add Item" />
      <div className="mt-4 rounded-t-[28px] border border-border bg-card px-6 pb-10 pt-3">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
        <div className="mt-5 flex items-start justify-between">
          <div>
            <p className="label-tag text-primary">New garment</p>
            <h2 className="mt-1 font-display text-[30px] font-medium leading-tight">Add to Wardrobe</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => router.history.back()}
            className="grid size-11 place-items-center rounded-full bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rose/50 text-primary-deep">
            <Sparkles className="size-5" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Mobidrobe suggests a colour and category from your photo or link — you can tweak them next.
          </p>
        </div>

        <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

        {draft ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background">
            <div className="flex gap-4 p-3">
              <img
                src={draft.image_url}
                alt="Selected garment"
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-28 rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col py-1">
                <p className="label-micro text-primary">{draft.source_url ? "Imported from link" : "Photo ready"}</p>
                <p className="mt-1 line-clamp-2 font-display text-lg leading-snug">{draft.name || "Untitled piece"}</p>
                {draft.brand && <p className="text-sm text-muted-foreground">{draft.brand}</p>}
                {draft.color && <p className="mt-1 text-xs text-muted-foreground">Colour: {draft.color}</p>}
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="mt-auto self-start text-sm font-medium text-primary-deep underline-offset-4 hover:underline"
                >
                  Choose another
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed border-primary/50 px-6 py-8 text-center">
              <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
                {busy === "photo" ? <Loader2 className="size-8 animate-spin" /> : <Camera className="size-8" strokeWidth={1.6} />}
              </span>
              <h3 className="mt-4 font-display text-[26px] font-medium">Upload a Photo</h3>
              <p className="mt-1 text-[15px] text-muted-foreground">Take a live photo or choose a shot from your library</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => cameraRef.current?.click()}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-medium text-primary-deep shadow-sm"
                >
                  <Camera className="size-4" /> Take Photo
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => libraryRef.current?.click()}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-medium text-primary-deep shadow-sm"
                >
                  <ImagePlus className="size-4" /> Browse Library
                </button>
              </div>
            </div>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="label-tag text-muted-foreground">Or import web garment</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="rounded-3xl bg-muted p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <Link2 className="size-5" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">Paste a Product Link</p>
                  <p className="text-sm text-muted-foreground">Works with most shopping sites</p>
                </div>
              </div>
              <form
                className="mt-4 flex h-14 items-center gap-2 rounded-2xl border border-border bg-card pl-4 pr-2 focus-within:border-primary"
                onSubmit={(e) => {
                  e.preventDefault();
                  onImport();
                }}
              >
                <label htmlFor="product-url" className="sr-only">Product link</label>
                <input
                  id="product-url"
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://brand.com/product/item"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
                {url.trim() ? (
                  <button
                    type="submit"
                    disabled={busy === "link"}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
                  >
                    {busy === "link" ? <Loader2 className="size-4 animate-spin" /> : null}
                    {busy === "link" ? "Importing" : "Import"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPaste}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-soft px-3.5 text-sm font-medium text-primary-deep"
                  >
                    <ClipboardPaste className="size-4" /> Paste
                  </button>
                )}
              </form>
              {linkError && <p className="mt-2 text-sm text-destructive">{linkError}</p>}
            </div>
          </>
        )}

        <div className="mt-7 flex items-center justify-between">
          <p className="text-[15px] font-semibold">Pre-assign Occasion</p>
          <p className="label-tag text-muted-foreground">Optional</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasions.includes(o)} check onClick={() => toggle(o)} className="h-11 px-5">
              {OCCASION_LABEL[o]}
            </Chip>
          ))}
        </div>

        <Button size="xl" className="mt-8 w-full shadow-lift" disabled={!draft} onClick={onContinue}>
          Continue <ArrowRight />
        </Button>
        {!draft && <p className="mt-2 text-center text-xs text-muted-foreground">Add a photo or link to continue</p>}
      </div>
    </Screen>
  );
}
