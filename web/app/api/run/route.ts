import { NextRequest, NextResponse } from "next/server";
import { currentJob, engineAvailable, startRun } from "@/lib/runJob";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const job = currentJob();
  return NextResponse.json(job ?? { status: "idle" }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!engineAvailable()) {
    return NextResponse.json(
      { error: "engine_unavailable" },
      { status: 501, headers: noStore },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: noStore },
    );
  }

  const { year, week, sample } = (body ?? {}) as {
    year?: unknown;
    week?: unknown;
    sample?: unknown;
  };

  if (
    typeof year !== "number" ||
    !Number.isInteger(year) ||
    year < 2014 ||
    year > 2035 ||
    typeof week !== "number" ||
    !Number.isInteger(week) ||
    week < 1 ||
    week > 16 ||
    typeof sample !== "boolean"
  ) {
    return NextResponse.json(
      { error: "invalid_arguments" },
      { status: 400, headers: noStore },
    );
  }

  try {
    const job = startRun(year, week, sample);
    return NextResponse.json(job, { status: 202, headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "run_in_progress") {
      return NextResponse.json(
        { error: "run_in_progress" },
        { status: 409, headers: noStore },
      );
    }
    return NextResponse.json(
      { error: "engine_unavailable" },
      { status: 501, headers: noStore },
    );
  }
}
