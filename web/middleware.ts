import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase Auth session cookie on each request so signed-in state
 * survives across navigations and reaches Server Components. No-op when Auth is
 * unconfigured. Never gates routes — browsing stays fully open; run-launch is
 * gated in the API layer, not here.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the user so @supabase/ssr rotates an expiring token into the response.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Page navigations only — refresh the session cookie there. API routes
    // (incl. the high-traffic /api/data artifact proxy) are skipped: route
    // handlers can write cookies, so getRequestUser() refreshes tokens itself.
    "/((?!api/|_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
