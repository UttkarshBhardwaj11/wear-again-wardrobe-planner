import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { GoogleButton } from "@/components/mobi/GoogleButton";
import { HangerIcon } from "@/components/mobi/Hanger";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { rememberAfterAuth, safeAppPath } from "@/lib/auth-redirect";
import { isConsentPath } from "@/lib/oauth-return-path";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; mode?: Mode } => ({
    ...(typeof s.redirect === "string" ? { redirect: s.redirect } : {}),
    ...(s.mode === "signup" || s.mode === "forgot" || s.mode === "signin" ? { mode: s.mode } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Mobidrobe" },
      { name: "description", content: "Sign in to Mobidrobe to open your wardrobe, outfits and calendar on any device." },
      { property: "og:title", content: "Sign in — Mobidrobe" },
      { property: "og:description", content: "Sign in to Mobidrobe to open your wardrobe, outfits and calendar on any device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "mt-2 h-14 w-full rounded-2xl border border-border bg-card px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again or reset your password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "There's already an account with this email. Sign in instead.";
  if (m.includes("password")) return message;
  return "Something went wrong. Please try again.";
}

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const target = safeAppPath(search.redirect);
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<"confirm" | "reset" | null>(null);

  const go = (path: string) => router.history.replace(path);

  // Already signed in? Skip straight to the wardrobe.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go(target);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setError(null);
  }, [mode]);

  const onGoogle = async () => {
    setBusy("google");
    setError(null);
    rememberAfterAuth(target);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(null);
      setError("Google sign-in didn't finish. Please try again.");
      return;
    }
    if (result.redirected) return;
    go(target);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        go(target);
      } else if (mode === "signup") {
        rememberAfterAuth(target);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Connecting an assistant: the confirmation link must land back on the approval page.
            emailRedirectTo: isConsentPath(target) ? new URL(target, window.location.origin).href : window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) go(target);
        else setSent("confirm");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      }
    } catch (err) {
      setError(friendly((err as Error).message ?? ""));
    } finally {
      setBusy(null);
    }
  };

  const title = mode === "signup" ? "Create your wardrobe" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const subtitle =
    mode === "signup"
      ? "An account keeps your pieces, outfits and plans safe — and on every device."
      : mode === "forgot"
        ? "Enter your email and we'll send you a link to choose a new password."
        : "Sign in to open your wardrobe.";

  return (
    <div className="min-h-dvh bg-secondary/60">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 pb-10 pt-12">
        <Link to="/" className="flex items-center gap-2 self-start text-primary" aria-label="Mobidrobe intro">
          <span className="grid size-11 place-items-center rounded-full border border-border bg-card shadow-ambient">
            <HangerIcon className="size-6" />
          </span>
          <span className="font-display text-2xl font-semibold text-foreground">Mobidrobe</span>
        </Link>

        {sent ? (
          <section className="mt-16 flex flex-col items-start animate-in fade-in duration-300">
            <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
              <MailCheck className="size-7" />
            </span>
            <h1 className="mt-6 font-display text-[34px] font-semibold leading-tight tracking-tight">Check your inbox</h1>
            <p className="mt-3 text-muted-foreground">
              {sent === "confirm"
                ? `We sent a confirmation link to ${email.trim()}. Open it on this device to finish setting up your wardrobe.`
                : `If ${email.trim()} has an account, a link to reset your password is on its way.`}
            </p>
            <Button
              variant="outline"
              size="xl"
              className="mt-8 w-full"
              onClick={() => {
                setSent(null);
                setMode("signin");
              }}
            >
              Back to sign in
            </Button>
          </section>
        ) : (
          <section key={mode} className="mt-12 flex flex-1 flex-col animate-in fade-in duration-300">
            <p className="label-tag text-primary">{mode === "signup" ? "New here" : "Your account"}</p>
            <h1 className="mt-2 font-display text-[34px] font-semibold leading-tight tracking-tight">{title}</h1>
            <p className="mt-3 text-muted-foreground">{subtitle}</p>

            {mode !== "forgot" && (
              <>
                <GoogleButton className="mt-8" onClick={onGoogle} disabled={!!busy} />
                <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or with email
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={onSubmit} className={mode === "forgot" ? "mt-8" : ""}>
              <label htmlFor="email" className="label-tag text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
              {mode !== "forgot" && (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="label-tag text-muted-foreground">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    className={inputClass}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" size="xl" disabled={!!busy} className="mt-8 w-full shadow-lift">
                {busy === "email" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="font-semibold text-primary">
                    Sign in
                  </button>
                </>
              ) : mode === "forgot" ? (
                <button type="button" onClick={() => setMode("signin")} className="font-semibold text-primary">
                  Back to sign in
                </button>
              ) : (
                <>
                  New to Mobidrobe?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="font-semibold text-primary">
                    Create an account
                  </button>
                </>
              )}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

