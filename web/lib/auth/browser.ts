"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/runtime/config";

/**
 * Browser-side Supabase client for Auth only (sign-in, sign-out, session state).
 * Reads the public URL + anon key, which ship safely in the client bundle.
 * Returns null when Auth isn't configured so callers can degrade gracefully.
 */
export function createAuthBrowserClient() {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
