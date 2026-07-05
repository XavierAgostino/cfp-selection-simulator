"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/useAuth";
import { GitHubMark } from "@/components/auth/GitHubMark";
import type { HostedRunCapabilities } from "@/lib/runJob";

interface SignInPanelProps {
  capabilities: HostedRunCapabilities;
  /** Where to return after the OAuth round-trip; defaults to the current path. */
  next?: string;
  className?: string;
}

/**
 * Gate surface for launching a hosted run. Browsing stays open everywhere — this
 * only appears where a run is initiated. Signed out: a one-click GitHub sign-in.
 * Signed in: identity plus the user's remaining daily runs.
 */
export function SignInPanel({ capabilities, next, className }: SignInPanelProps) {
  const { configured, loading, user, signInWithGitHub, signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);

  // Auth not wired up on this deployment — the server still gates, so say nothing.
  if (!configured) return null;

  if (loading) {
    return (
      <div
        className={cn(
          "h-[52px] animate-pulse rounded-lg border border-border/60 bg-secondary/40",
          className,
        )}
      />
    );
  }

  if (user) {
    const remaining = capabilities.user_daily_jobs_remaining;
    const handle = user.username ?? user.email ?? "Signed in";
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="size-7 shrink-0 rounded-full ring-1 ring-border/60"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {handle.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{handle}</p>
            <p className="text-xs text-muted-foreground">
              {remaining !== null
                ? `${remaining} run${remaining === 1 ? "" : "s"} left today`
                : "Signed in"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void signOut()}
          className="text-muted-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-3",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Sign in to launch a live analysis. Browsing the field stays open — no account
        needed.
      </p>
      <Button
        variant="default"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGitHub(next);
          } finally {
            setBusy(false);
          }
        }}
        className="self-start"
      >
        <GitHubMark className="size-4" />
        {busy ? "Redirecting…" : "Sign in with GitHub"}
      </Button>
    </div>
  );
}
