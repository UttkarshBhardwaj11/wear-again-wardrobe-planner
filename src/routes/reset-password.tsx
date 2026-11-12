import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { HangerIcon } from "@/components/mobi/Hanger";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Mobidrobe" },
      { name: "description", content: "Set a new password for your Mobidrobe account." },
      { property: "og:title", content: "Choose a new password — Mobidrobe" },
      { property: "og:description", content: "Set a new password for your Mobidrobe account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

const inputClass =
  "mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("code=");
    supabase.auth.getSession().then(({ data }) => {
      setReady(data.session || isRecovery ? "ok" : "invalid");
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message || "Couldn't update your password. Request a new link and try again.");
      return;
    }
    toast.success("Password updated");
    router.history.replace("/home");
  };

  return (
    <div className="min-h-dvh bg-secondary/60">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 pb-10 pt-12">
        <div className="flex items-center gap-2 text-primary">
          <span className="grid size-11 place-items-center rounded-full border border-border bg-card shadow-ambient">
            <HangerIcon className="size-6" />
          </span>
          <span className="font-display text-2xl font-semibold text-foreground">Mobidrobe</span>
        </div>
        <section className="mt-12">
          <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-[34px] font-semibold leading-tight tracking-tight">Choose a new password</h1>
          {ready === "invalid" ? (
            <>
              <p className="mt-3 text-muted-foreground">This reset link has expired or was already used.</p>
              <Button asChild size="xl" className="mt-8 w-full">
                <Link to="/auth" search={{ mode: "forgot" }}>
                  Send a new link
                </Link>
              </Button>
            </>
          ) : (
            <form onSubmit={onSubmit} className="mt-8">
              <label htmlFor="new-password" className="label-tag text-muted-foreground">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
              <label htmlFor="confirm-password" className="mt-5 block label-tag text-muted-foreground">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
              {error && (
                <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="xl" disabled={busy || ready === "checking"} className="mt-8 w-full shadow-lift">
                {busy ? <Loader2 className="animate-spin" /> : <>Save password <ArrowRight /></>}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
