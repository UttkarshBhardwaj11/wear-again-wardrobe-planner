import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import { supabase } from "@/integrations/supabase/client";
import { clearWardrobe, resetToSample, resetWardrobe, useWardrobe } from "@/lib/wardrobe/store";
import { Wordmark } from "./Hanger";

export function ProfileAvatar() {
  const state = useWardrobe();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = hydrated ? state.profile?.name || "" : "";
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    resetWardrobe();
    navigate({ to: "/auth", replace: true });
  };
  const initials = name ? name.trim().slice(0, 1).toUpperCase() : "M";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Profile and settings"
        className="grid size-10 place-items-center rounded-full border border-border bg-primary-soft font-display text-lg font-semibold text-primary-deep"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl">
        <DropdownMenuLabel className="font-display text-base">
          {name ? `${name}'s wardrobe` : "Your wardrobe"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            toast.promise(resetToSample(), {
              loading: "Restoring the sample wardrobe…",
              success: "Sample wardrobe restored",
              error: "Couldn't restore the sample wardrobe. Please try again.",
            });
          }}
        >
          Restore sample wardrobe
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            toast.promise(clearWardrobe(), {
              loading: "Clearing your wardrobe…",
              success: "Wardrobe cleared — add your first piece",
              error: "Couldn't clear your wardrobe. Please try again.",
            });
          }}
        >
          Start with an empty wardrobe
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/welcome" })}>Change my name</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="gap-2">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({
  title,
  back,
  right,
}: {
  title?: ReactNode;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/90 px-5 backdrop-blur">
      {back ? (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/home" }))}
          className="-ml-2 grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : (
        <Link to="/home" aria-label="Mobidrobe home">
          <Wordmark />
        </Link>
      )}
      {title && <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-medium">{title}</h1>}
      {!title && <div className="flex-1" />}
      {right ?? <ProfileAvatar />}
    </header>
  );
}
