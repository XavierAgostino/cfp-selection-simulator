/**
 * User-facing label casing for Selection Room UI.
 *
 * Raw keys (scenario_id, data_source, model baselines) stay lowercase in data;
 * map through these helpers before rendering badges, chips, and status labels.
 */

import { BASE_SCENARIO_ID } from "@/lib/scenarioWeights";

/** Data source chip / badge label. */
export function formatDataSourceLabel(source: "cfbd" | "sample"): string {
  return source === "cfbd" ? "Live CFBD" : "Sample demo";
}

/** Base vs weight-variant run kind. */
export function formatRunKindLabel(isScenario: boolean): string {
  return isScenario ? "Scenario" : "Base";
}

/** Scenario chip in Scenario Lab (Base when weights match defaults). */
export function formatScenarioChipLabel(
  scenarioId: string,
  options?: { matchesBase?: boolean },
): string {
  if (options?.matchesBase || scenarioId === BASE_SCENARIO_ID) return "Base";
  return scenarioId;
}

/** Validation field-size badge on era-correct selection rows. */
export function formatValidationFieldSizeLabel(correct: boolean): string {
  return correct ? "Correct field size" : "Wrong field size";
}

/** Committee outlier marker on validation season rows. */
export function formatCommitteeOutlierLabel(): string {
  return "Committee outlier";
}

/** Run catalog capability badges. */
export function formatRunCapabilityLabel(
  capability: "bracket" | "sensitivity",
): string {
  if (capability === "bracket") return "Bracket ready";
  return "Has sensitivity";
}

/** Scenario diff summary chip copy. */
export function formatSeedChangesLabel(count: number): string {
  return count === 1 ? "1 seed change" : `${count} seed changes`;
}

export function formatRankShiftsLabel(count: number): string {
  return count === 1 ? "1 rank shift" : `${count} rank shifts`;
}

export function formatMovedIntoFieldLabel(count: number): string {
  return count === 1 ? "1 moved into field" : `${count} moved into field`;
}

export function formatDroppedOutLabel(count: number): string {
  return count === 1 ? "1 dropped out" : `${count} dropped out`;
}

/** Validation CLI target scope from validation.json. */
const VALIDATION_TARGET_LABELS: Record<string, string> = {
  all: "All",
  committee: "Committee",
  selection: "Selection",
  predictive: "Predictive",
};

export function formatValidationTargetLabel(target: string): string {
  return VALIDATION_TARGET_LABELS[target] ?? humanizeKey(target);
}

/** Predictive baseline display names from validation/API model keys. */
const PREDICTIVE_BASELINE_LABELS: Record<string, string> = {
  composite: "Composite",
  elo: "ELO",
  srs: "SRS",
  home_field: "Home field",
};

export function formatPredictiveBaselineLabel(model: string): string {
  return PREDICTIVE_BASELINE_LABELS[model] ?? humanizeKey(model);
}

function humanizeKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
