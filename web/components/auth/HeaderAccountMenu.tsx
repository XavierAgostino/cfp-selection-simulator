"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/useAuth";
import { GitHubMark } from "@/components/auth/GitHubMark";

/**
 * Persistent account affordance in the global header. Only appears where Supabase
 * Auth is wired up (hosted) — stays invisible on the demo/local builds. Browsing is
 * always open; this is a convenience surface, never a gate. Signed out shows a
 * one-click GitHub sign-in; signed in shows the avatar with a sign-out menu.
 */
export function HeaderAccountMenu() {
  const pathname = usePathname();
  const { configured, loading, user, signInWithGitHub, signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);

  if (!configured) return null;

  if (loading) {
    return <Skeleton className="size-8 rounded-full" aria-hidden />;
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGitHub(pathname);
          } finally {
            setBusy(false);
          }
        }}
        className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <GitHubMark className="size-4" />
        <span className="hidden sm:inline">{busy ? "Redirecting…" : "Sign in"}</span>
      </Button>
    );
  }

  const handle = user.username ?? user.email ?? "Account";
  const initial = handle.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-opacity duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "hover:opacity-90 data-[popup-open]:ring-2 data-[popup-open]:ring-ring/50",
        )}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-8 rounded-full object-cover ring-1 ring-border/60"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-border/60">
            {initial}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-full ring-1 ring-border/60"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initial}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{handle}</p>
            {user.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
