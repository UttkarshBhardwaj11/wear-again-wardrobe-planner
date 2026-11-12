import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { HangerIcon } from "@/components/mobi/Hanger";
import { supabase } from "@/integrations/supabase/client";
import { getState, loadWardrobe } from "@/lib/wardrobe/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    await loadWardrobe(user.id);
    if (!getState().profile && location.pathname !== "/welcome") {
      throw redirect({ to: "/welcome" });
    }
    return { user };
  },
  pendingMs: 150,
  pendingComponent: WardrobeLoading,
  component: () => <Outlet />,
});

function WardrobeLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4 text-primary">
        <div className="grid size-20 animate-pulse place-items-center rounded-full border border-border bg-card shadow-ambient">
          <HangerIcon className="size-10" strokeWidth={1.3} />
        </div>
        <p className="label-tag text-muted-foreground">Opening your wardrobe…</p>
      </div>
    </div>
  );
}
