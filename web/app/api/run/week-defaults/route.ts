import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { REPO_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export interface WeekDefaultsResponse {
  season: number;
  data_source: "sample" | "cfbd";
  default_week: number;
  max_available_week: number;
  week_labels: Record<string, string>;
}

function pythonBin(): string | null {
  const venv = path.join(REPO_DIR, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return existsSync(path.join(REPO_DIR, "src", "pipeline", "default_week.py"))
    ? "python3"
    : null;
}

function fetchWeekDefaults(
  season: number,
  dataSource: "sample" | "cfbd",
): Promise<WeekDefaultsResponse | null> {
  const py = pythonBin();
  if (!py) return Promise.resolve(null);

  return new Promise((resolve) => {
    const child = spawn(
      py,
      [
        "-m",
        "src.pipeline.default_week",
        "--season",
        String(season),
        "--data-source",
        dataSource,
      ],
      { cwd: REPO_DIR, env: process.env },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error("week-defaults subprocess failed:", stderr.trim());
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()) as WeekDefaultsResponse);
      } catch {
        console.error("week-defaults invalid JSON:", stdout.trim());
        resolve(null);
      }
    });
  });
}

/** Fallback when Python is unavailable (e.g. static deploy read-only). */
function fallbackWeekDefaults(
  season: number,
  dataSource: "sample" | "cfbd",
): WeekDefaultsResponse {
  // Fallback when the Python resolver can't be spawned. Both the sample fixture
  // and the current-era live cache top out at the championship-weekend field
  // (week 15); week 16 carries no additional games, so we never surface it here.
  const maxAvailable = 15;
  return {
    season,
    data_source: dataSource,
    default_week: 15,
    max_available_week: maxAvailable,
    week_labels: {
      "15": "Week 15 · Championship weekend · final field",
    },
  };
}

export async function GET(request: NextRequest) {
  const seasonRaw = request.nextUrl.searchParams.get("season");
  const dataSourceRaw = request.nextUrl.searchParams.get("data_source");

  const season = Number.parseInt(seasonRaw ?? "", 10);
  if (
    !Number.isInteger(season) ||
    season < 2014 ||
    season > 2035 ||
    (dataSourceRaw !== "sample" && dataSourceRaw !== "cfbd")
  ) {
    return NextResponse.json(
      { error: "invalid_params" },
      { status: 400, headers: noStore },
    );
  }

  const resolved =
    (await fetchWeekDefaults(season, dataSourceRaw)) ??
    fallbackWeekDefaults(season, dataSourceRaw);

  return NextResponse.json(resolved, { headers: noStore });
}
