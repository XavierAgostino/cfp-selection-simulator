import { NextResponse, type NextRequest } from "next/server";

import { createAuthServerClient } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * OAuth redirect target: exchanges the provider code for a Supabase session,
 * then returns the user to wherever they started (`next`, same-origin only).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Only allow same-origin relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (code) {
    const supabase = await createAuthServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard?auth_error=1`);
}
