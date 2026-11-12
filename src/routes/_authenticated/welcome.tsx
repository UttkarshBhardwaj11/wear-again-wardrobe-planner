import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { HangerIcon } from "@/components/mobi/Hanger";
import { Button } from "@/components/ui/button";
import { completeOnboarding, renameProfile, useWardrobe } from "@/lib/wardrobe/store";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({
    meta: [
      { title: "Set up your wardrobe — Mobidrobe" },
      { name: "description", content: "Tell Mobidrobe what to call you and step into your sample wardrobe." },
      { property: "og:title", content: "Set up your wardrobe — Mobidrobe" },
      { property: "og:description", content: "Tell Mobidrobe what to call you and step into your sample wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const state = useWardrobe();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const onboarded = !!state.profile;
  const suggested =
    state.profile?.name ??
    String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "")
      .split(" ")[0]
      .slice(0, 30);
  const [name, setName] = useState(suggested);

  const finish = (n: string) => {
    if (onboarded) renameProfile(n);
    else completeOnboarding(n);
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-dvh bg-secondary/60">
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-background px-6 pb-10 pt-14">
        <section className="flex flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
            <HangerIcon className="size-7" />
          </div>
          <p className="mt-8 label-tag text-primary">{onboarded ? "Your profile" : "Set up your wardrobe"}</p>
          <h2 className="mt-2 font-display text-[34px] font-semibold leading-tight tracking-tight">
            What should we call you?
          </h2>
          {!onboarded && (
            <p className="mt-3 text-muted-foreground">
              We've hung a sample capsule on your rail so you can try everything right away. Add your own pieces any time.
            </p>
          )}
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) finish(name);
            }}
          >
            <label htmlFor="name" className="label-tag text-muted-foreground">
              Your first name
            </label>
            <input
              id="name"
              autoFocus
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              className="mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 text-lg outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <Button type="submit" size="xl" disabled={!name.trim()} className="mt-8 w-full shadow-lift">
              {onboarded ? "Save" : "Enter my wardrobe"} <ArrowRight />
            </Button>
          </form>
          <button
            type="button"
            onClick={() => (onboarded ? navigate({ to: "/home" }) : finish(""))}
            className="mt-5 text-center text-sm tracking-wide text-muted-foreground"
          >
            {onboarded ? "Cancel" : "Continue without a name"}
          </button>
        </section>
      </main>
    </div>
  );
}
