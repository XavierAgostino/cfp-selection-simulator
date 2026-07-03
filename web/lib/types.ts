/**
 * TypeScript mirrors of the Selection Room JSON API contract.
 *
 * Source of truth: /docs/api-contracts.md (repo root), which mirrors the
 * Pydantic v2 models in src/api_contracts/models.py. Field names stay
 * snake_case on purpose — there is no camelCase mapping layer between the
 * wire format and the UI.
 */

export type Ruleset = "2024" | "2025_plus";
export type SeedingMode = "champion_byes" | "straight";
export type DataSource = "cfbd" | "sample";
export type BidType = "auto" | "at_large";
export type Location = "home" | "away" | "neutral";
export type SemifinalSide = "top" | "bottom";
export type PodId = "top_1" | "top_2" | "bottom_1" | "bottom_2";
export type AssetsSource = "cache" | "sample";

export interface Record_ {
  wins: number;
  losses: number;
}

/** Shared object embedded across field/bracket/rankings payloads. */
export interface TeamSlot {
  seed: number | null;
  rank: number;
  team: string;
  abbreviation: string | null;
  conference: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  bid_type: BidType;
  is_bye: boolean;
  composite_score: number;
  resume_score: number;
  predictive_score: number;
  sor: number;
  sos: number;
  record: Record_;
}

// ---------------------------------------------------------------------------
// runs.json
// ---------------------------------------------------------------------------

export interface RunSummary {
  stem: string;
  run_id: string;
  scenario_id: string;
  season: number;
  week: number;
  ruleset: Ruleset;
  data_source: DataSource;
  champion_source: string;
  generated_at: string;
  has_bracket: boolean;
  has_sensitivity: boolean;
  simulator_version: string;
  config_hash: string;
  weights: Record<"resume" | "predictive" | "sor" | "sos", number>;
  label: string;
}

export interface RunsPayload {
  schema_version: 1;
  generated_at: string;
  latest: { season: number; week: number; stem: string };
  runs: RunSummary[];
}

// ---------------------------------------------------------------------------
// latest.json
// ---------------------------------------------------------------------------

export interface LatestPayload {
  schema_version: 1;
  product: string;
  simulator_version: string;
  season: number;
  week: number;
  stem: string;
  ruleset: Ruleset;
  seeding_mode: SeedingMode;
  bye_rule: string;
  data_source: DataSource;
  champion_source: string;
  config_hash: string;
  generated_at: string;
  assets_source: AssetsSource;
  weights: {
    resume: number;
    predictive: number;
    sor: number;
    sos: number;
  };
  counts: {
    n_games: number;
    n_teams: number;
  };
  has_bracket: boolean;
}

// ---------------------------------------------------------------------------
// rankings.json
// ---------------------------------------------------------------------------

export interface RankingRow {
  rank: number;
  team: string;
  abbreviation: string | null;
  conference: string;
  composite_score: number;
  resume_score: number;
  predictive_score: number;
  sor: number;
  sos: number;
  is_conference_champion: boolean;
  champion_of: string | null;
  record: Record_;
  in_field: boolean;
  bid_type: BidType | null;
  seed: number | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface RankingsPayload {
  schema_version: 1;
  season: number;
  week: number;
  generated_at: string;
  teams: RankingRow[];
}

// ---------------------------------------------------------------------------
// field.json
// ---------------------------------------------------------------------------

export interface FieldPayload {
  schema_version: 1;
  season: number;
  week: number;
  ruleset: Ruleset;
  seeding_mode: SeedingMode;
  field: TeamSlot[];
  auto_bids: TeamSlot[];
  at_large_bids: TeamSlot[];
  last_four_in: TeamSlot[];
  first_four_out: TeamSlot[];
  next_four_out: TeamSlot[];
  displaced_team: TeamSlot | null;
  champ_pulled_in: boolean;
}

// ---------------------------------------------------------------------------
// bracket.json
// ---------------------------------------------------------------------------

export interface BracketPod {
  pod_id: PodId;
  first_round: TeamSlot[];
  bye: TeamSlot;
  quarterfinal_id: string;
  semifinal_side: SemifinalSide;
}

export interface FirstRoundGame {
  game_id: string;
  team_a: TeamSlot;
  team_b: TeamSlot;
  winner_to_seed: number;
}

export interface QuarterfinalGame {
  game_id: string;
  bye_team: TeamSlot;
  feeds_from: string;
}

export interface SemifinalPairing {
  side: SemifinalSide;
  pods: [string, string];
}

export interface BracketRounds {
  first_round: FirstRoundGame[];
  quarterfinals: QuarterfinalGame[];
  semifinals: SemifinalPairing[];
  championship: { label: string };
}

export interface BracketPayload {
  schema_version: 1;
  season: number;
  week: number;
  ruleset: Ruleset;
  seeding_mode: SeedingMode;
  pods: BracketPod[];
  rounds: BracketRounds;
}

// ---------------------------------------------------------------------------
// audit.json
// ---------------------------------------------------------------------------

export interface AuditStepEntry {
  step: string;
  message: string;
}

export interface AuditPhase {
  step: string;
  messages: string[];
}

export interface AuditPayload {
  schema_version: 1;
  season: number;
  week: number;
  ruleset: Ruleset;
  steps: AuditStepEntry[];
  phases: AuditPhase[];
  log: string[];
  displaced_team: string | null;
  first_four_out: string[];
}

// ---------------------------------------------------------------------------
// team-resumes.json
// ---------------------------------------------------------------------------

export interface ScheduleGame {
  week: number;
  opponent: string;
  opponent_rank: number | null;
  location: Location;
  result: "W" | "L";
  points_for: number;
  points_against: number;
}

export interface TeamResume {
  team: string;
  abbreviation: string | null;
  conference: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  rank: number;
  seed: number | null;
  bid_type: BidType | null;
  in_field: boolean;
  is_conference_champion: boolean;
  champion_of: string | null;
  record: Record_;
  scores: {
    composite: number;
    resume: number;
    predictive: number;
    sor: number;
    sos: number;
  };
  component_ranks: {
    resume: number;
    predictive: number;
    sor: number;
    sos: number;
  };
  why_in: string[];
  concerns: string[];
  schedule: ScheduleGame[];
}

export interface TeamResumesPayload {
  schema_version: 1;
  season: number;
  week: number;
  teams: Record<string, TeamResume>;
}

// ---------------------------------------------------------------------------
// sensitivity.json — Selection Stability (Monte Carlo weight perturbation)
// ---------------------------------------------------------------------------

export type StabilityStatus =
  | "lock"
  | "likely_in"
  | "bubble"
  | "likely_out"
  | "out";
export type StabilityBaseStatus = "in_field" | "first_out" | "next_out" | "out";
export type StabilityOutcome = "in_field" | "first_out" | "out";
export type StabilityRisk =
  | "none"
  | "weight_sensitivity"
  | "auto_bid_displacement"
  | "composite_gap";

export interface PerturbationSpec {
  method: string;
  relative_range: number;
  base_weights: {
    resume: number;
    predictive: number;
    sor: number;
    sos: number;
  };
}

export interface BaseFieldCutoff {
  final_at_large_team: string | null;
  final_at_large_score: number | null;
  first_team_out: string | null;
  first_team_out_score: number | null;
}

export interface SelectionStabilityTeam {
  team: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
  /** Share of scenarios where the team made the projected field, 0-1. */
  selection_frequency: number;
  in_field_count: number;
  n_scenarios: number;
  base_rank: number;
  base_seed: number | null;
  base_selected: boolean;
  base_status: StabilityBaseStatus;
  status: StabilityStatus;
  median_rank: number;
  most_common_outcome: StabilityOutcome;
  primary_risk: StabilityRisk;
}

export interface SensitivityPayload {
  schema_version: 1;
  season: number;
  week: number;
  ruleset: Ruleset;
  generated_at: string;
  n_scenarios: number;
  random_seed: number;
  perturbation_spec: PerturbationSpec;
  base_field_cutoff: BaseFieldCutoff;
  teams: SelectionStabilityTeam[];
}

// ---------------------------------------------------------------------------
// team-assets.json
// ---------------------------------------------------------------------------

export interface TeamAsset {
  cfbd_id: number | null;
  espn_id: string | null;
  abbreviation: string | null;
  conference: string;
  logo: string | null;
  logo_source: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export type TeamAssetsPayload = Record<string, TeamAsset>;

// ---------------------------------------------------------------------------
// Route handler error contract
// ---------------------------------------------------------------------------

export interface NotFoundPayload {
  error: "not_found";
}
