import { NextRequest, NextResponse } from "next/server";
import { extractBetaCode } from "@/lib/runtime/beta-access";
import { isHostedRuntimeConfigured } from "@/lib/runtime/config";
import { HostedRunError } from "@/lib/runtime/errors";
import {
  createAndStartRun,
  getActiveJob,
  getCapabilities,
  mapHostedRunError,
  parseRunRequest,
  validateHostedRun,
} from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const active = await getActiveJob();
  if (!active) {
    return NextResponse.json({ status: "idle" }, { headers: noStore });
  }
  return NextResponse.json(active, { headers: noStore });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: noStore },
    );
  }

  const runRequest = parseRunRequest(body);
  if (!runRequest) {
    return NextResponse.json(
      { error: "invalid_arguments" },
      { status: 400, headers: noStore },
    );
  }

  if (isHostedRuntimeConfigured()) {
    const betaCode = extractBetaCode(
      request.headers,
      body as Record<string, unknown>,
    );
    try {
      await validateHostedRun(runRequest, betaCode);
      // H5: create job and enqueue; unreachable until executor is configured.
      const job = await createAndStartRun(runRequest);
      return NextResponse.json(
        { job_id: job.job_id },
        { status: 202, headers: noStore },
      );
    } catch (err) {
      if (err instanceof HostedRunError) {
        const mapped = mapHostedRunError(err);
        return NextResponse.json(mapped.body, {
          status: mapped.status,
          headers: noStore,
        });
      }
      const message = err instanceof Error ? err.message : "unknown";
      return NextResponse.json(
        { error: message },
        { status: 500, headers: noStore },
      );
    }
  }

  const caps = await getCapabilities();
  if (!caps.run_generation_enabled) {
    return NextResponse.json(
      { error: "run_generation_disabled" },
      { status: 501, headers: noStore },
    );
  }

  try {
    const job = await createAndStartRun(runRequest);
    return NextResponse.json(
      { job_id: job.job_id },
      { status: 202, headers: noStore },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "run_in_progress") {
      return NextResponse.json(
        { error: "run_in_progress" },
        { status: 409, headers: noStore },
      );
    }
    if (message === "daily_job_cap_exceeded") {
      return NextResponse.json(
        { error: "daily_job_cap_exceeded" },
        { status: 429, headers: noStore },
      );
    }
    if (message === "cfbd_unavailable") {
      return NextResponse.json(
        { error: "cfbd_unavailable" },
        { status: 400, headers: noStore },
      );
    }
    if (message === "live_run_throttled") {
      return NextResponse.json(
        { error: "live_run_throttled" },
        { status: 429, headers: noStore },
      );
    }
    return NextResponse.json(
      { error: "run_generation_disabled" },
      { status: 501, headers: noStore },
    );
  }
}
