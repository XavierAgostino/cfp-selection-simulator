import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/server";
import { getCapabilities } from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getRequestUser();
  const caps = await getCapabilities(user);
  return NextResponse.json(caps, { headers: noStore });
}
