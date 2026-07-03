import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { jobId } = await context.params;
  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  return NextResponse.json(job, { headers: noStore });
}
