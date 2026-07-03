/**
 * Tooltip copy for Scenario Lab surfaces (weights, diffs, empty state).
 */

export type ScenarioLabTermKey =
  | "scenario"
  | "base_run"
  | "config_hash"
  | "normalize_weights"
  | "field_changes"
  | "seed_changes"
  | "bubble_movement"
  | "bracket_impact";

export interface ScenarioLabExplanation {
  label: string;
  description: string;
}

export const SCENARIO_LAB_EXPLANATIONS: Record<
  ScenarioLabTermKey,
  ScenarioLabExplanation
> = {
  scenario: {
    label: "Scenario",
    description:
      "A simulated rerun of selection under different composite weights. Results are projected reorderings, not probabilities.",
  },
  base_run: {
    label: "Base run",
    description:
      "The starting run whose season, week, and data are held fixed while weights change. Every scenario forks from one base run.",
  },
  config_hash: {
    label: "Scenario ID",
    description:
      "A deterministic id derived from the four weight percents (for example w45-25-20-10). Same weights always map to the same scenario stem.",
  },
  normalize_weights: {
    label: "Normalized weights",
    description:
      "Sliders always rebalance to 100%. Adjusting one weight redistributes the remainder so the composite stays a proper weighted mix.",
  },
  field_changes: {
    label: "Field changes",
    description:
      "Teams entering or leaving the projected 12-team field under this ruleset after the reweight.",
  },
  seed_changes: {
    label: "Seed changes",
    description:
      "How bracket seeds shift for teams that remain in the projected field under the simulated weights.",
  },
  bubble_movement: {
    label: "Bubble movement",
    description:
      "Changes around the cut line: last four in and first four out before versus after the scenario.",
  },
  bracket_impact: {
    label: "Bracket impact",
    description:
      "How reseeding would reorder projected matchups. This reflects simulated seeds, not game outcomes.",
  },
};
