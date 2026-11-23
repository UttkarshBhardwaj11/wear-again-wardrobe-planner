import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/mobi/AppHeader";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { LockOutfitSheet } from "@/components/mobi/LockOutfitSheet";
import { Screen } from "@/components/mobi/Screen";
import { Button } from "@/components/ui/button";
import { askStylist, type StylistOutfit } from "@/lib/ai/stylist.functions";
import { prettyDate, todayISO } from "@/lib/wardrobe/dates";
import { garmentById } from "@/lib/wardrobe/derive";
import { lockOutfit, useWardrobe } from "@/lib/wardrobe/store";
import { OCCASION_LABEL, type Garment } from "@/lib/wardrobe/types";
import { describeWeather, useForecast, usePlace } from "@/lib/weather";

export const Route = createFileRoute("/_authenticated/stylist")({
  head: () => ({
    meta: [
      { title: "AI Stylist — Mobidrobe" },
      { name: "description", content: "Chat with your personal stylist for outfit ideas built from your own wardrobe." },
      { property: "og:title", content: "AI Stylist — Mobidrobe" },
      { property: "og:description", content: "Chat with your personal stylist for outfit ideas built from your own wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stylist,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
  outfits?: StylistOutfit[];
}

const PROMPTS = ["What should I wear tonight?", "Style my least worn piece", "A smart casual Friday look", "Outfit for a wedding sangeet"];

function Stylist() {
  const state = useWardrobe();
  const ask = useServerFn(askStylist);
  const { place } = usePlace();
  const forecast = useForecast(place);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState<StylistOutfit | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const today = todayISO();

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  const send = async (content: string) => {
    const q = content.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setText("");
    setBusy(true);
    const day = forecast.data?.days.find((d) => d.date === today);
    try {
      const res = await ask({
        data: {
          today,
          weather: day ? `${place.label}: ${day.max}°C, ${describeWeather(day.code).label}` : undefined,
          messages: next.map(({ role, content }) => ({ role, content })),
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        setMsgs(msgs);
        setText(q);
      } else setMsgs([...next, { role: "assistant", content: res.reply, outfits: res.outfits }]);
    } catch {
      toast.error("The stylist couldn't answer just now. Please try again.");
      setMsgs(msgs);
      setText(q);
    } finally {
      setBusy(false);
    }
  };

  const pieces = (o: StylistOutfit) => o.garment_ids.map((id) => garmentById(state, id)).filter((g): g is Garment => !!g);

  return (
    <Screen>
      <AppHeader title="AI Stylist" />
      <div className="px-5 pb-40 pt-5">
        {msgs.length === 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <Sparkles className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-display text-2xl">Your personal stylist</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask for outfit ideas — I only use pieces you already own, and know what you've worn lately.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:border-primary">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div key={i} className="space-y-3">
                <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm">
                  {m.content}
                </div>
                {m.outfits?.map((o, j) => {
                  const gs = pieces(o);
                  return (
                    <div key={j} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-display text-lg">{o.title}</p>
                        <span className="label-micro text-primary-deep">{OCCASION_LABEL[o.occasion]}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {gs.map((g) => (
                          <Link key={g.id} to="/item/$id" params={{ id: g.id }} className="block">
                            <GarmentImage src={g.image_url} alt={g.name} eager className="aspect-square w-full rounded-xl" />
                            <p className="mt-1 truncate text-xs text-muted-foreground">{g.name}</p>
                          </Link>
                        ))}
                      </div>
                      {o.note && <p className="mt-3 text-sm text-muted-foreground">{o.note}</p>}
                      <Button size="sm" className="mt-3 w-full" onClick={() => setLocking(o)}>
                        <CalendarPlus className="size-4" /> Lock to calendar
                      </Button>
                    </div>
                  );
                })}
              </div>
            ),
          )}
          {busy && <div className="w-24 animate-pulse rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Styling…</div>}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-full max-w-md gap-2 px-4"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask your stylist…"
          maxLength={500}
          aria-label="Message the stylist"
          className="h-12 min-w-0 flex-1 rounded-full border border-border bg-card px-5 text-sm shadow-sm outline-none focus:border-primary"
        />
        <Button type="submit" size="icon" className="size-12 rounded-full" disabled={busy || !text.trim()} aria-label="Send">
          <Send className="size-5" />
        </Button>
      </form>

      {locking && (
        <LockOutfitSheet
          open
          onOpenChange={(o) => !o && setLocking(null)}
          outfitTitle={locking.title}
          garments={pieces(locking)}
          defaultDate={today}
          defaultEvent=""
          onConfirm={(v) => {
            lockOutfit({ occasion: locking.occasion, name: locking.title, garmentIds: locking.garment_ids, ...v });
            toast.success(`Locked for ${prettyDate(v.plan_date)}`);
            setLocking(null);
          }}
        />
      )}
    </Screen>
  );
}
