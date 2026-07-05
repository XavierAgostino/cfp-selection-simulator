import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabasePublicUrl } from "@/lib/runtime/config";

export interface RequestUser {
  id: string;
  email: string | null;
}

/**
 * Server-side Supabase Auth client bound to the request cookies. Used by route
 * handlers and server components to read the signed-in user. Cookie writes are
 * best-effort — Server Components can't mutate cookies, so session refresh is
 * handled in middleware (see web/middleware.ts). Returns null when unconfigured.
 */
export async function createAuthServerClient() {
  const url = getSupabasePublicUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware refreshes instead.
        }
      },
    },
  });
}

/** The signed-in user for this request, or null when signed out / unconfigured. */
export async function getRequestUser(): Promise<RequestUser | null> {
  const supabase = await createAuthServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  return { id: user.id, email: user.email ?? null };
}
