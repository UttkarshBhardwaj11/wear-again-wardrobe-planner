import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, CalendarHeart, Shirt, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GarmentImage } from "@/components/mobi/GarmentImage";
import { HangerIcon } from "@/components/mobi/Hanger";
import { supabase } from "@/integrations/supabase/client";
import { takeAfterAuth } from "@/lib/auth-redirect";
import { getState, loadWardrobe, useWardrobe } from "@/lib/wardrobe/store";
import { cn } from "@/lib/utils";

type Step = "brand" | "catalogue" | "suggest" | "plan";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mobidrobe — Your wardrobe in your pocket" },
      {
        name: "description",
        content: "Build a digital wardrobe, get outfit ideas for any occasion and lock looks to your calendar.",
      },
      { property: "og:title", content: "Mobidrobe — Your wardrobe in your pocket" },
      {
        property: "og:description",
        content: "Build a digital wardrobe, get outfit ideas for any occasion and lock looks to your calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const SLIDES: { key: Step; eyebrow: string; title: string; body: string; icon: typeof Shirt; images: string[] }[] = [
  {
    key: "catalogue",
    eyebrow: "01 — Catalogue",
    title: "Everything you own, in one quiet place",
    body: "Snap a photo or paste a shopping link. Tag it by occasion and it joins your wardrobe in under a minute.",
    icon: Shirt,
    images: ["seed:camel-coat", "seed:rust-kurta", "seed:tan-chelsea-boots"],
  },
  {
    key: "suggest",
    eyebrow: "02 — Suggest",
    title: "Outfits for the occasion, from your own rail",
    body: "Describe the event — a client dinner, a college fest — and get complete combos built from pieces you already have.",
    icon: WandSparkles,
    images: ["seed:black-blazer", "seed:ivory-silk-blouse", "seed:chocolate-wide-leg"],
  },
  {
    key: "plan",
    eyebrow: "03 — Plan",
    title: "Lock looks to dates, never double-up",
    body: "Save outfits to your calendar. Your wear history quietly flags anything you wore last week.",
    icon: CalendarHeart,
    images: ["seed:emerald-lehenga", "seed:gold-juttis", "seed:maroon-saree"],
  },
];

function Onboarding() {
  const state = useWardrobe();
  const navigate = useNavigate();
  const router = useRouter();
  const [step, setStep] = useState<Step>("brand");
  const [account, setAccount] = useState<"checking" | "signed-out" | "signed-in">("checking");
  const returning = account === "signed-in" && step === "brand";

  // Signed-in visitors (including those returning from Google) go on to their wardrobe.
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!alive) return;
      if (!user) {
        setAccount("signed-out");
        return;
      }
      const pending = takeAfterAuth();
      if (pending) {
        router.history.replace(pending);
        return;
      }
      try {
        await loadWardrobe(user.id);
      } catch {
        // the wardrobe screens will retry
      }
      if (!alive) return;
      if (!getState().profile) {
        navigate({ to: "/welcome", replace: true });
        return;
      }
      setAccount("signed-in");
    });
    return () => {
      alive = false;
    };
  }, [navigate, router]);

  const finish = () => {
    if (account === "signed-in") navigate({ to: "/home" });
    else navigate({ to: "/auth", search: { mode: "signup" } });
  };

  const slideIdx = SLIDES.findIndex((s) => s.key === step);
  const dots = ["brand", "catalogue", "suggest", "plan"] as Step[];

  return (
    <div className="min-h-dvh bg-secondary/60">
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-background px-6 pb-10 pt-14">
        {step === "brand" && (
          <section className="flex flex-1 flex-col items-center text-center">
            <div className="relative mt-6 grid size-56 place-items-center">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-rose)_0%,transparent_68%)] opacity-40" />
              <div className="relative grid size-28 place-items-center rounded-full border border-border bg-card text-primary shadow-ambient">
                <HangerIcon className="size-14" strokeWidth={1.3} />
              </div>
            </div>
            <h1 className="mt-6 font-display text-[52px] font-semibold leading-none tracking-tight">Mobidrobe</h1>
            <p className="mt-4 text-lg tracking-wide text-muted-foreground">Your wardrobe in your pocket</p>
            <Dots active={0} dots={dots} />
            <div className="mt-auto w-full pt-12">
              {returning ? (
                <>
                  <p className="mb-4 font-display text-xl">
                    Welcome back{state.profile?.name ? `, ${state.profile.name}` : ""}
                  </p>
                  <Button asChild size="xl" className="w-full shadow-lift">
                    <Link to="/home">
                      Open my wardrobe <ArrowRight />
                    </Link>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep("catalogue")}
                    className="mt-5 text-sm tracking-wide text-muted-foreground"
                  >
                    Replay the intro
                  </button>
                </>
              ) : (
                <>
                  <Button size="xl" className="w-full shadow-lift" onClick={() => setStep("catalogue")}>
                    Get Started
                  </Button>
                  <p className="mt-5 text-sm tracking-wide text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {slideIdx >= 0 && (
          <section key={step} className="flex flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <p className="label-tag text-primary">{SLIDES[slideIdx].eyebrow}</p>
              <button type="button" onClick={finish} className="text-sm text-muted-foreground">
                Skip
              </button>
            </div>
            <div className="relative mt-8 h-80">
              {SLIDES[slideIdx].images.map((img, i) => (
                <div
                  key={img}
                  className={cn(
                    "absolute w-[46%] overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-ambient",
                    i === 0 && "left-0 top-6 -rotate-6",
                    i === 1 && "left-[27%] top-0 z-10",
                    i === 2 && "right-0 top-10 rotate-6",
                  )}
                >
                  <GarmentImage src={img} alt="" eager className="aspect-[3/4] w-full rounded-xl" />
                </div>
              ))}
            </div>
            <h2 className="mt-8 font-display text-[32px] font-semibold leading-[1.15] tracking-tight">
              {SLIDES[slideIdx].title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{SLIDES[slideIdx].body}</p>
            <Dots active={slideIdx + 1} dots={dots} className="justify-start" />
            <div className="mt-auto pt-8">
              <Button
                size="xl"
                className="w-full shadow-lift"
                onClick={() => (slideIdx < SLIDES.length - 1 ? setStep(SLIDES[slideIdx + 1].key) : finish())}
              >
                Continue <ArrowRight />
              </Button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

function Dots({ active, dots, className }: { active: number; dots: Step[]; className?: string }) {
  return (
    <div className={cn("mt-8 flex justify-center gap-2", className)} aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={d}
          className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-primary" : "w-2 bg-rose/60")}
        />
      ))}
    </div>
  );
}
