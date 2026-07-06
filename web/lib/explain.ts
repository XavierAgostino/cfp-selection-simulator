/**
 * Central explanation copy for every metric and badge in Selection Room.
 *
 * One source of truth so the same term reads identically in the rankings
 * table, dashboard cards, bubble board, bracket, drawer, and methodology
 * page. Copy standard: say "projected"/"simulated", never "official";
 * explain assumptions plainly; always use "Resume" (no accent).
 */

import type { ScoreMetricKey } from "@/lib/scoreBars";

export interface MetricExplanation {
  label: string;
  /** One or two plain sentences. Shown in tooltips sitewide. */
  description: string;
}

export type ExplainMetricKey =
  | ScoreMetricKey
  | "cut_line"
  | "record"
  | "selection_stability"
  | "composite_profile"
  | "resume_edge"
  | "predictive_edge"
  | "sor_edge"
  | "sos_edge";

export const METRIC_EXPLANATIONS: Record<ExplainMetricKey, MetricExplanation> = {
  composite: {
    label: "Composite",
    description:
      "The overall ranking score: a weighted blend of Resume (40%), Predictive (30%), SOR (20%), and SOS (10%). Weights were calibrated on the 2014-2024 seasons.",
  },
  resume: {
    label: "Resume",
    description:
      "What a team has earned on the field: wins, losses, and the quality of those results this season.",
  },
  predictive: {
    label: "Predictive",
    description:
      "Estimated true team strength: how good the team looks independent of who it has played. Blends margin-aware ratings (Massey) with Elo.",
  },
  sor: {
    label: "SOR",
    description:
      "Strength of Record: how impressive this team's win-loss record is given the schedule it actually played.",
  },
  sos: {
    label: "SOS",
    description:
      "Strength of Schedule: how difficult this team's slate of opponents was, win or lose.",
  },
  cut_line: {
    label: "Cut Line",
    description:
      "The composite score of the last at-large team in the projected field. Teams below it are out; the margin shows how close each bubble team sits.",
  },
  record: {
    label: "Record",
    description:
      "Wins and losses across all games in this run's data window. The column header reflects the record type (FBS, demo, or model-window).",
  },
  selection_stability: {
    label: "Selection Stability",
    description:
      "The share of Monte Carlo weight scenarios where a team remains in the projected field. It varies model weights, not future game results.",
  },
  composite_profile: {
    label: "Composite Profile",
    description:
      "A normalized comparison of the two teams' composite scores for this matchup. It is not a game win probability.",
  },
  resume_edge: {
    label: "Resume Edge",
    description: "Which team has the stronger earned-results profile.",
  },
  predictive_edge: {
    label: "Predictive Edge",
    description:
      "Which team rates stronger on forward-looking team-strength measures.",
  },
  sor_edge: {
    label: "SOR Edge",
    description: "Which team has the stronger strength-of-record profile.",
  },
  sos_edge: {
    label: "SOS Edge",
    description: "Which team faced the tougher schedule.",
  },
};

export interface BadgeExplanation {
  label: string;
  description: string;
}

export type ExplainBadgeKey =
  | "auto"
  | "at_large"
  | "bye"
  | "first_out"
  | "out"
  | "sample_data"
  | "live_data"
  | "bracket_ready";

export const BADGE_EXPLANATIONS: Record<ExplainBadgeKey, BadgeExplanation> = {
  auto: {
    label: "AUTO",
    description:
      "Automatic bid: one of the five highest-ranked conference champions, guaranteed a spot regardless of overall rank.",
  },
  at_large: {
    label: "AT-LARGE",
    description:
      "At-large bid: selected on composite ranking to fill one of the seven remaining spots after automatic bids.",
  },
  bye: {
    label: "BYE",
    description:
      "First-round bye: seeds 1-4 skip the opening round and start in the quarterfinals.",
  },
  first_out: {
    label: "FIRST OUT",
    description:
      "The highest-ranked team left out of the projected field. This is the very top of the bubble.",
  },
  out: {
    label: "OUT",
    description: "Outside the projected field under this run's rankings.",
  },
  sample_data: {
    label: "Sample",
    description:
      "This run uses the bundled sample dataset, not live results. Launch a run with live CFBD data to see the real season.",
  },
  live_data: {
    label: "Live CFBD",
    description:
      "This run was built from live College Football Data API game results.",
  },
  bracket_ready: {
    label: "Bracket ready",
    description:
      "A full simulated bracket (first round through the championship) was generated for this run.",
  },
};
