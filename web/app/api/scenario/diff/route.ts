import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { API_DATA_DIR, RUNS_JSON_PATH } from "@/lib/paths";
import { getScenarioDiff, runIdFromStem } from "@/lib/scenarioDiff";
import type { ScenarioWeights } from "@/lib/scenarioWeights";
import type {
  FieldPayload,
  RankingsPayload,
  RunsPayload,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Run stems are season_weekNN plus an optional __scenario suffix — no separators. */
const STEM_PATTERN = /^[A-Za-z0-9_-]+$/;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: noStore });
}

async function readRunFile<T>(stem: string, kind: string): Promise<T | null> {
  const filePath = path.join(API_DATA_DIR, "runs", stem, `${kind}.json`);
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseStem = searchParams.get("base");
  const scenarioStem = searchParams.get("scenario");

  if (!baseStem || !scenarioStem) {
    return badRequest("missing_stem");
  }
  if (!STEM_PATTERN.test(baseStem) || !STEM_PATTERN.test(scenarioStem)) {
    return badRequest("invalid_stem");
  }
  if (baseStem === scenarioStem) {
    return badRequest("identical_stems");
  }
  // A diff only makes sense within one season/week — the weights are the only
  // thing allowed to differ between the two runs being compared.
  if (runIdFromStem(baseStem) !== runIdFromStem(scenarioStem)) {
    return badRequest("run_mismatch");
  }

  const [baseRankings, scenarioRankings, baseField, scenarioField] =
    await Promise.all([
      readRunFile<RankingsPayload>(baseStem, "rankings"),
      readRunFile<RankingsPayload>(scenarioStem, "rankings"),
      readRunFile<FieldPayload>(baseStem, "field"),
      readRunFile<FieldPayload>(scenarioStem, "field"),
    ]);

  if (!baseRankings || !baseField) {
    return NextResponse.json(
      { error: "base_not_found" },
      { status: 404, headers: noStore },
    );
  }
  if (!scenarioRankings || !scenarioField) {
    return NextResponse.json(
      { error: "scenario_not_found" },
      { status: 404, headers: noStore },
    );
  }

  // Weights live in the runs index, not the per-run payloads.
  let baseWeights: ScenarioWeights | null = null;
  let scenarioWeights: ScenarioWeights | null = null;
  try {
    const runs = JSON.parse(
      await fs.readFile(RUNS_JSON_PATH, "utf-8"),
    ) as RunsPayload;
    const byStem = new Map(runs.runs.map((entry) => [entry.stem, entry]));
    baseWeights = byStem.get(baseStem)?.weights ?? null;
    scenarioWeights = byStem.get(scenarioStem)?.weights ?? null;
  } catch {
    // Weights are decorative on the diff; proceed without them if runs.json is missing.
  }

  const diff = getScenarioDiff({
    baseStem,
    scenarioStem,
    baseRankings,
    scenarioRankings,
    baseField,
    scenarioField,
    baseWeights,
    scenarioWeights,
  });

  return NextResponse.json(diff, { headers: noStore });
}
