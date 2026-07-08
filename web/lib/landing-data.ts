import { readFile } from "fs/promises";
import path from "path";
import { getRunFile, getValidationData, NotFoundError } from "@/lib/data";
import { finalFit2025, loadRevealedPreferences } from "@/lib/revealedPreferences";
import type {
  BracketPayload,
  FieldPayload,
  FittedWeights,
  SensitivityPayload,
  TeamResumesPayload,
  TeamResume,
  ValidationPayload,
} from "@/lib/types";

/**
 * Committee Tendencies preview: baseline vs the fit approximation for the most
 * recent final fit, plus the artifact's own short disclaimer. Null whenever the
 * research-only artifact is absent, off-contract, or missing that final fit —
 * the landing section then renders nothing (fail-closed).
 */
export interface CommitteeTendenciesHeadline {
  disclaimerShort: string;
  baseline: FittedWeights;
  fitted: FittedWeights;
}

/**
 * Credibility metrics for the validation strip. Every field is derived at load
 * time from validation.json; any value not directly sourceable from the fixture
 * is null and omitted from the UI rather than approximated.
 */
export interface ValidationHeadlines {
  latestFieldOverlap: { value: string; season: number } | null;
  avgTop12Overlap: string | null;
  seasonRange: string | null;
}

export interface LandingPreviewData {
  field: FieldPayload;
  bracket: BracketPayload;
  resumes: TeamResumesPayload;
  sensitivity: SensitivityPayload | null;
  validation: ValidationPayload | null;
  featuredResume: TeamResume;
  seasonLabel: string;
  committeeTendencies: CommitteeTendenciesHeadline | null;
  validationHeadlines: ValidationHeadlines | null;
}

async function loadFixture<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "lib/fixtures", filename);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function loadRunOrFixture<T>(kind: string, filename: string): Promise<T> {
  try {
    return (await getRunFile(
      null,
      kind as "field" | "bracket" | "team-resumes" | "sensitivity",
    )) as T;
  } catch (err) {
    if (err instanceof NotFoundError) {
      return loadFixture<T>(filename);
    }
    throw err;
  }
}

async function loadOptionalSensitivity(): Promise<SensitivityPayload | null> {
  try {
    return await loadRunOrFixture<SensitivityPayload>("sensitivity", "sensitivity.json");
  } catch {
    return null;
  }
}

function pickFeaturedResume(
  field: FieldPayload,
  resumes: TeamResumesPayload,
): TeamResume {
  const candidates = [
    field.last_four_in.at(-1)?.team,
    field.first_four_out[0]?.team,
    field.at_large_bids[0]?.team,
    field.field[2]?.team,
  ].filter((name): name is string => Boolean(name));

  for (const team of candidates) {
    const resume = resumes.teams[team];
    if (resume && resume.detail_level !== "summary") {
      return resume;
    }
  }

  for (const team of candidates) {
    const resume = resumes.teams[team];
    if (resume) return resume;
  }

  const first = Object.values(resumes.teams)[0];
  if (!first) {
    throw new Error("Landing preview requires at least one team resume");
  }
  return first;
}

/**
 * Committee Tendencies headline via the production-safe revealed-preferences
 * path (same fail-closed loader the public rollout uses). Null unless the
 * artifact validates AND carries the latest final fit.
 */
async function loadCommitteeTendencies(): Promise<CommitteeTendenciesHeadline | null> {
  const payload = await loadRevealedPreferences();
  if (!payload) return null;
  const entry = finalFit2025(payload);
  if (!entry) return null;
  return {
    disclaimerShort: payload.disclaimer_short,
    baseline: payload.production_baseline,
    fitted: entry.fitted_weights,
  };
}

/**
 * Credibility metrics, derived strictly from validation.json. Labels stay in
 * "overlap" language; anything the fixture cannot support is left null so the
 * strip omits it rather than inventing a number.
 */
function deriveValidationHeadlines(
  validation: ValidationPayload | null,
): ValidationHeadlines | null {
  if (!validation) return null;

  // Latest season whose selection field is a 12-team field (label ".../12").
  const latestTwelveTeam = [...validation.selection]
    .filter((row) => /\/\s*12$/.test(row.field_overlap_label))
    .sort((a, b) => b.year - a.year)[0];
  const latestFieldOverlap = latestTwelveTeam
    ? { value: latestTwelveTeam.field_overlap_label, season: latestTwelveTeam.year }
    : null;

  const meanTop12 = validation.summary.committee?.mean_top12_overlap;
  const avgTop12Overlap =
    typeof meanTop12 === "number"
      ? `${Math.round(meanTop12 * 100)}%`
      : null;

  const years = validation.years;
  const seasonRange =
    years.length > 0
      ? `${Math.min(...years)}–${Math.max(...years)}`
      : null;

  if (!latestFieldOverlap && !avgTop12Overlap && !seasonRange) return null;
  return { latestFieldOverlap, avgTop12Overlap, seasonRange };
}

/** Real product data for landing previews — live run when available, fixtures otherwise. */
export async function getLandingPreviewData(): Promise<LandingPreviewData> {
  const [field, bracket, resumes, sensitivity, validation, committeeTendencies] =
    await Promise.all([
      loadRunOrFixture<FieldPayload>("field", "field.json"),
      loadRunOrFixture<BracketPayload>("bracket", "bracket.json"),
      loadRunOrFixture<TeamResumesPayload>("team-resumes", "team-resumes.json"),
      loadOptionalSensitivity(),
      getValidationData().then(
        async (data) => data ?? loadFixture<ValidationPayload>("validation.json"),
      ),
      loadCommitteeTendencies(),
    ]);

  const featuredResume = pickFeaturedResume(field, resumes);

  return {
    field,
    bracket,
    resumes,
    sensitivity,
    validation,
    featuredResume,
    seasonLabel: `${field.season} · Week ${field.week}`,
    committeeTendencies,
    validationHeadlines: deriveValidationHeadlines(validation),
  };
}
