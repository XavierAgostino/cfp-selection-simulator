import { NextResponse } from "next/server";
import { getCapabilities } from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const caps = await getCapabilities();
  return NextResponse.json(caps, { headers: noStore });
}
