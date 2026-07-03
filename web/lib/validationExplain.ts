/**
 * Tooltip copy for the /validation dashboard. Separate from ranking metrics
 * because validation uses different framing (retrospective, baselines, etc.).
 */

import { formatPredictiveBaselineLabel } from "@/lib/displayLabels";

export type ValidationTermKey =
  | "committee_agreement"
  | "committee_alignment"
  | "top12_overlap"
  | "bubble_overlap"
  | "field_accuracy"
  | "era_correct_rules"
  | "field_overlap"
  | "seeds_within_one"
  | "predictive_signal"
  | "predictive_accuracy"
  | "predictive_brier"
  | "predictive_composite"
  | "predictive_elo"
  | "predictive_srs"
  | "predictive_home_field"
  | "outlier_seasons"
  | "validation_scope";

export interface ValidationExplanation {
  label: string;
  description: string;
}

export const VALIDATION_EXPLANATIONS: Record<
  ValidationTermKey,
  ValidationExplanation
> = {
  committee_agreement: {
    label: "Committee Agreement",
    description:
      "How closely the model's top-12 ordering tracks the real committee across completed seasons. Higher rank correlation and overlap mean closer agreement, not that either side is correct.",
  },
  committee_alignment: {
    label: "Committee alignment",
    description:
      "Season-by-season comparison of the model's ranking bands against the published committee order on finished seasons.",
  },
  top12_overlap: {
    label: "Top-12 overlap",
    description:
      "How many of the committee's top 12 teams also appear in the model's top 12 for that season.",
  },
  bubble_overlap: {
    label: "Bubble overlap",
    description:
      "Overlap in the bubble band around the cut line: teams the committee and model both treated as in contention.",
  },
  field_accuracy: {
    label: "Field Accuracy",
    description:
      "Whether the model produced the correct field size under each season's era rules, and how much of the actual field it matched. Scoped to seasons in this validation artifact.",
  },
  era_correct_rules: {
    label: "Era-correct rules",
    description:
      "Each season is scored against the playoff format that actually applied that year, not today's rules.",
  },
  field_overlap: {
    label: "Field overlap",
    description:
      "Share of the real committee field the model also selected under that season's era-correct ruleset.",
  },
  seeds_within_one: {
    label: "Seeds within one",
    description:
      "Share of teams whose simulated seed was within one slot of the committee's seed assignment.",
  },
  predictive_signal: {
    label: "Predictive Signal",
    description:
      "Retrospective game-level scoring on completed games. This is not a live forecast or win probability.",
  },
  predictive_accuracy: {
    label: "Accuracy",
    description:
      "Share of completed games where the signal picked the winning side. Higher is better.",
  },
  predictive_brier: {
    label: "Brier",
    description:
      "Lower Brier means the scored signal was closer to the actual completed-game result.",
  },
  predictive_composite: {
    label: "Composite",
    description:
      "Selection Room's combined game-level signal from the model's weighted components. Used here only for retrospective scoring on completed games.",
  },
  predictive_elo: {
    label: "ELO",
    description:
      "A rating-system baseline that updates team strength from game results. Included as a comparison point, not as the selection model.",
  },
  predictive_srs: {
    label: "SRS",
    description:
      "Simple Rating System baseline based on scoring margin and schedule strength. Included as a simpler comparison model.",
  },
  predictive_home_field: {
    label: "Home field",
    description:
      "A simple baseline that favors the home team. Useful as a minimum comparison for game-level signal.",
  },
  outlier_seasons: {
    label: "Outlier seasons",
    description:
      "Seasons where the committee behaved unusually relative to the model. These are labeled, not hidden, so the summary stays honest.",
  },
  validation_scope: {
    label: "Validation scope",
    description:
      "Retrospective scoring on completed seasons only, using era-correct rules. Outlier seasons are labeled where applicable.",
  },
};

const PREDICTIVE_MODEL_TERMS: Record<string, ValidationTermKey> = {
  composite: "predictive_composite",
  elo: "predictive_elo",
  srs: "predictive_srs",
  home_field: "predictive_home_field",
};

/** Human label for a predictive baseline key from validation.json. */
export function predictiveModelLabel(model: string): string {
  return formatPredictiveBaselineLabel(model);
}

/** Tooltip term key for a predictive model row, if defined. */
export function predictiveModelTerm(model: string): ValidationTermKey | null {
  return PREDICTIVE_MODEL_TERMS[model] ?? null;
}

export type ValidationTeamRole =
  | "model_added"
  | "model_dropped"
  | "committee_first_out"
  | "model_first_out";

export interface ValidationTeamRoleCopy {
  statusLine: string;
  roleLabel: string;
  explanation: string;
  chipVariant: "chip-gold" | "chip-neutral" | "outline";
}

export const VALIDATION_TEAM_ROLES: Record<
  ValidationTeamRole,
  ValidationTeamRoleCopy
> = {
  model_added: {
    chipVariant: "chip-gold",
    roleLabel: "Model added",
    statusLine: "Model included · Committee excluded",
    explanation:
      "Model added this team to the projected field, but the committee did not select it in the validated season.",
  },
  model_dropped: {
    chipVariant: "chip-neutral",
    roleLabel: "Model dropped",
    statusLine: "Committee included · Model excluded",
    explanation:
      "The committee selected this team, but the model left it outside the projected field.",
  },
  committee_first_out: {
    chipVariant: "outline",
    roleLabel: "Committee first team out",
    statusLine: "Committee first team out",
    explanation:
      "The highest-ranked team outside the field for the committee side of this comparison.",
  },
  model_first_out: {
    chipVariant: "outline",
    roleLabel: "Model first team out",
    statusLine: "Model first team out",
    explanation:
      "The highest-ranked team outside the field for the model side of this comparison.",
  },
};
