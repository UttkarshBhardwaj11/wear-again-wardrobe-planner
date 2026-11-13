import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { HangerIcon } from "@/components/mobi/Hanger";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { takeAfterAuth } from "@/lib/auth-redirect";

const SCOPE_LABEL: Record<string, string> = {
  openid: "Confirm who you are",
  profile: "Share your basic profile",
  email: "Share your email address",
};

const CAPABILITIES = [
  "See your wardrobe pieces and their wear history",
  "See the outfits on your calendar",
  "Suggest outfits from your pieces",
  "Lock outfits to your calendar",
];

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // SSR has no browser session and would bounce signed-in people to sign-in.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Connect an assistant — Mobidrobe" },
      { name: "description", content: "Approve or cancel an assistant's access to your Mobidrobe wardrobe." },
      { property: "og:title", content: "Connect an assistant — Mobidrobe" },
      { property: "og:description", content: "Approve or cancel an assistant's access to your Mobidrobe wardrobe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its request id. Start connecting again from your assistant.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname + location.searchStr } });
    }
    takeAfterAuth(); // we're back on the approval page; drop the remembered return path
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const [{ data, error }, { data: userData }] = await Promise.all([
      supabase.auth.oauth.getAuthorizationDetails(deps.id),
      supabase.auth.getUser(),
    ]);
    if (error) throw new Error("This connection request has expired or is no longer valid. Start connecting again from your assistant.");
    if (data && !("client" in data && data.client)) {
      const immediate = (data as { redirect_url?: string; redirect_to?: string }).redirect_url ?? (data as { redirect_to?: string }).redirect_to;
      if (immediate) throw redirect({ href: immediate });
    }
    if (!data || !("client" in data)) throw new Error("This connection request couldn't be read. Start connecting again from your assistant.");
    return { details: data, email: userData.user?.email ?? data.user?.email ?? "" };
  },
  pendingComponent: () => (
    <Shell>
      <div className="mt-24 flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="label-tag">Checking the request…</p>
      </div>
    </Shell>
  ),
  errorComponent: ({ error }) => (
    <Shell>
      <section className="mt-14">
        <p className="label-tag text-primary">Connection</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight">We couldn't open this request</h1>
        <p className="mt-3 text-muted-foreground">{error instanceof Error ? error.message : "Something went wrong."}</p>
        <Button asChild variant="outline" size="xl" className="mt-8 w-full">
          <Link to="/home">Back to my wardrobe</Link>
        </Button>
      </section>
    </Shell>
  ),
  component: Consent,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-secondary/60">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 pb-10 pt-12">
        <div className="flex items-center gap-2 text-primary">
          <span className="grid size-11 place-items-center rounded-full border border-border bg-card shadow-ambient">
            <HangerIcon className="size-6" />
          </span>
          <span className="font-display text-2xl font-semibold text-foreground">Mobidrobe</span>
        </div>
        {children}
      </main>
    </div>
  );
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = details.client?.name || "This assistant";
  const scopes = (details.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    const target = (data as { redirect_url?: string; redirect_to?: string } | null)?.redirect_url ??
      (data as { redirect_to?: string } | null)?.redirect_to;
    if (error || !target) {
      setBusy(null);
      setError(
        approve
          ? "We couldn't approve the connection. Please try again, or start again from your assistant."
          : "We couldn't cancel the connection. Please try again.",
      );
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <section className="mt-12 flex flex-1 flex-col animate-in fade-in duration-300">
        <p className="label-tag text-primary">Connect an assistant</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-tight">
          Connect {client} to Mobidrobe
        </h1>
        <p className="mt-3 text-muted-foreground">
          This lets {client} use Mobidrobe as you{email ? <> (<span className="text-foreground">{email}</span>)</> : null}.
        </p>
        {details.redirect_uri && (
          <p className="mt-2 text-sm text-muted-foreground">Returns to {hostOf(details.redirect_uri)}</p>
        )}

        <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-ambient">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> It will be able to
          </p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {CAPABILITIES.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {c}
              </li>
            ))}
            {scopes.map((s) => (
              <li key={s} className="flex gap-2 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border" />
                {SCOPE_LABEL[s] ?? `Additional permission requested: ${s}`}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            It only ever sees your own wardrobe — never anyone else's.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-auto pt-10">
          <Button size="xl" className="w-full shadow-lift" disabled={!!busy} onClick={() => decide(true)}>
            {busy === "approve" ? <Loader2 className="animate-spin" /> : `Allow ${client}`}
          </Button>
          <Button variant="outline" size="xl" className="mt-3 w-full" disabled={!!busy} onClick={() => decide(false)}>
            {busy === "deny" ? <Loader2 className="animate-spin" /> : "Cancel connection"}
          </Button>
        </div>
      </section>
    </Shell>
  );
}
