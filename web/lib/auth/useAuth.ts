"use client";

import * as React from "react";

import { createAuthBrowserClient } from "@/lib/auth/browser";

export interface AuthUser {
  id: string;
  email: string | null;
  /** GitHub login handle, when available. */
  username: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  /** Whether Supabase Auth is wired up in this deployment. */
  configured: boolean;
  /** True until the initial session check resolves. */
  loading: boolean;
  user: AuthUser | null;
  signInWithGitHub: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function toAuthUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const username =
    (typeof meta.user_name === "string" && meta.user_name) ||
    (typeof meta.preferred_username === "string" && meta.preferred_username) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    null;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  return { id: user.id, email: user.email ?? null, username, avatarUrl };
}

export function useAuth(): AuthState {
  const [client] = React.useState(() => createAuthBrowserClient());
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(Boolean(client));

  React.useEffect(() => {
    if (!client) return;
    let active = true;

    client.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toAuthUser(data.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const signInWithGitHub = React.useCallback(
    async (next?: string) => {
      if (!client) return;
      const target = next && next.startsWith("/") ? next : window.location.pathname;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
      await client.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });
    },
    [client],
  );

  const signOut = React.useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  }, [client]);

  return {
    configured: Boolean(client),
    loading,
    user,
    signInWithGitHub,
    signOut,
  };
}
