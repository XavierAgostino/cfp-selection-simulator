import { NextResponse } from "next/server";

import { listRecentJobs } from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const jobs = await listRecentJobs(25);
  return NextResponse.json({ jobs }, { headers: noStore });
}
