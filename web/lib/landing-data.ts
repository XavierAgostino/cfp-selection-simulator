import { readFile } from "fs/promises";
import path from "path";
import { getRunFile, getValidationData, NotFoundError } from "@/lib/data";
import type {
  BracketPayload,
  FieldPayload,
  SensitivityPayload,
  TeamResumesPayload,
  TeamResume,
  ValidationPayload,
} from "@/lib/types";

export interface LandingPreviewData {
  field: FieldPayload;
  bracket: BracketPayload;
  resumes: TeamResumesPayload;
  sensitivity: SensitivityPayload | null;
  validation: ValidationPayload | null;
  featuredResume: TeamResume;
  seasonLabel: string;
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

/** Real product data for landing previews — live run when available, fixtures otherwise. */
export async function getLandingPreviewData(): Promise<LandingPreviewData> {
  const [field, bracket, resumes, sensitivity, validation] = await Promise.all([
    loadRunOrFixture<FieldPayload>("field", "field.json"),
    loadRunOrFixture<BracketPayload>("bracket", "bracket.json"),
    loadRunOrFixture<TeamResumesPayload>("team-resumes", "team-resumes.json"),
    loadOptionalSensitivity(),
    getValidationData().then(async (data) => data ?? loadFixture<ValidationPayload>("validation.json")),
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
  };
}
