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
export type RecordLabel = "fbs_record" | "demo_record" | "model_window_record";
export type DetailLevel = "summary" | "full";
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
  record_meta?: RecordMeta | null;
}

export interface RecordMeta {
  record_universe: "fbs";
  record_game_scope: "display";
  model_start_week: number;
  record_start_week: number;
  through_week: number;
  includes_ccg: boolean;
  data_source: DataSource;
  is_demo_fixture: boolean;
  record_label: RecordLabel;
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
  record_meta?: RecordMeta | null;
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

export type SelectionCaseStatus = "selected" | "out" | "bubble" | "summary";

export interface SelectionCase {
  status: SelectionCaseStatus;
  headline: string;
  reasons: string[];
  concerns: string[];
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
  detail_level?: DetailLevel;
  selection_case?: SelectionCase | null;
  why_in: string[];
  concerns: string[];
  schedule: ScheduleGame[];
}

export interface TeamResumesPayload {
  schema_version: 1;
  season: number;
  week: number;
  generated_at: string;
  record_meta?: RecordMeta | null;
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
// committee.json — Model vs Committee comparison for one run (optional; only
// present when the season has checked-in committee reference data)
// ---------------------------------------------------------------------------

export type CommitteeAgreement =
  | "both_in"
  | "both_out"
  | "model_only"
  | "committee_only";

export interface CommitteeComparisonTeam {
  team: string;
  abbreviation: string | null;
  conference: string | null;
  logo_url: string | null;
  primary_color: string | null;
  model_rank: number | null;
  committee_rank: number | null;
  /** committee_rank - model_rank; positive = the model ranks the team higher. */
  rank_delta: number | null;
  model_in_field: boolean;
  committee_in_field: boolean;
  model_seed: number | null;
  committee_seed: number | null;
  model_bid_type: BidType | null;
  committee_bid_type: BidType | null;
  agreement: CommitteeAgreement;
}

export interface CommitteeComparisonSummary {
  committee_field_size: number;
  model_field_size: number;
  field_overlap_count: number;
  field_overlap_ratio: number;
  model_only_field: string[];
  committee_only_field: string[];
  model_first_team_out: string | null;
  committee_first_team_out: string | null;
  /** Only set when the fields are the same size (field_comparable). */
  seed_exact_matches: number | null;
}

export interface CommitteeComparisonPayload {
  schema_version: 1;
  season: number;
  week: number;
  ruleset: Ruleset;
  generated_at: string;
  reference: "final";
  reference_label: string;
  source_note: string;
  field_comparable: boolean;
  summary: CommitteeComparisonSummary;
  teams: CommitteeComparisonTeam[];
}

// ---------------------------------------------------------------------------
// validation.json  (repo-level, optional — how the model differs from the
// real CFP committee across historical seasons)
// ---------------------------------------------------------------------------

export interface CommitteeValidationRow {
  year: number;
  spearman_top25: number | null;
  spearman_top12: number | null;
  top12_overlap_ratio: number;
  top12_overlap_label: string;
  bubble_overlap_ratio: number;
  bubble_overlap_label: string;
  is_outlier: boolean;
  notes: string;
}

export interface SelectionValidationRow {
  year: number;
  era: string;
  ruleset: string;
  rule_target: string;
  field_overlap_ratio: number;
  field_overlap_label: string;
  correct_field_size: boolean;
  false_positives: string[];
  false_negatives: string[];
  first_team_out_match: boolean | null;
  first_team_out_ref: string | null;
  first_team_out_sim: string | null;
  displacement_count: number;
  seeding_exact_match: number | null;
  seeding_within_one: number | null;
  is_outlier: boolean;
  notes: string;
}

export interface PredictiveValidationRow {
  year: number;
  model: string;
  brier_score: number;
  win_accuracy: number;
  margin_mae: number;
  margin_rmse: number;
}

export interface CommitteeSummary {
  seasons: number;
  mean_spearman_top12: number | null;
  mean_top12_overlap: number | null;
  mean_bubble_overlap: number | null;
}

export interface SelectionSummary {
  seasons: number;
  correct_field_rate: number | null;
  mean_field_overlap: number | null;
  first_team_out_match_rate: number | null;
  mean_seeding_within_one: number | null;
}

export interface PredictiveSummary {
  seasons: number;
  mean_brier: number | null;
  mean_win_accuracy: number | null;
  mean_margin_mae: number | null;
}

export interface ValidationSummary {
  committee: CommitteeSummary | null;
  selection: SelectionSummary | null;
  predictive: PredictiveSummary | null;
}

export interface ValidationPayload {
  schema_version: 1;
  generated_at: string;
  years: number[];
  target: string;
  outlier_years: number[];
  summary: ValidationSummary;
  committee: CommitteeValidationRow[];
  selection: SelectionValidationRow[];
  predictive: PredictiveValidationRow[];
}

// ---------------------------------------------------------------------------
// revealed-preferences.json (research-only; read from data/output/calibration,
// NEVER promoted to web/lib/fixtures or the public data routes without an
// explicit review decision — see docs/api-contracts.md)
// ---------------------------------------------------------------------------

export interface FittedWeights {
  resume: number;
  predictive: number;
  sor: number;
  sos: number;
}

export interface RevealedTeamShift {
  team: string;
  committee_rank: number | null;
  baseline_rank: number;
  fitted_rank: number;
  rank_delta: number;
}

export interface RevealedNearOptimalCandidate {
  weights: FittedWeights;
  rank_error: number | null;
  spearman_top12: number | null;
}

export interface RevealedFitQuality {
  rank_error: number | null;
  spearman_top12: number | null;
  baseline_rank_error: number | null;
  top12_overlap: number | null;
  field_overlap: number | null;
  brier: number | null;
}

export interface RevealedInterpretation {
  headline: string;
  confidence: "directional" | "moderate" | "high";
  warning: string | null;
}

export interface RevealedExplanationScope {
  explains: string[];
  does_not_explain: string[];
}

export interface RevealedPreferencesEntry {
  research_only: true;
  objective: string;
  search_step: number;
  committee_rank_source: string;
  year: number;
  week: number;
  fitted_weights: FittedWeights;
  near_optimal_count: number;
  near_optimal_spread_pp: Partial<Record<keyof FittedWeights, number>>;
  near_optimal_region: RevealedNearOptimalCandidate[];
  baseline_delta_pp: Record<string, Record<string, number> | null>;
  fit_quality: RevealedFitQuality;
  fit_warning: string | null;
  warning_badges: string[];
  interpretation: RevealedInterpretation;
  teams_helped: RevealedTeamShift[];
  teams_hurt: RevealedTeamShift[];
  focus_team_shifts: Record<string, RevealedTeamShift>;
  explanation_scope: RevealedExplanationScope;
}

export interface RevealedPublicCase {
  reproduces_committee_order: boolean;
  committee_order: string;
  fitted_shift: Record<
    string,
    {
      committee_rank: number | null;
      baseline_rank: number;
      fitted_rank: number;
      rank_delta: number;
    }
  >;
  baseline_delta_pp: Record<string, number>;
  explanation: string;
  headline: string;
}

export interface RevealedPreferencesPayload {
  schema_version: 1;
  research_only: true;
  generated_at: string;
  requested_years: number[];
  production_baseline: FittedWeights;
  disclaimer: string;
  disclaimer_short: string;
  badge_explainers: Record<string, string>;
  warning_badges: string[];
  entries: RevealedPreferencesEntry[];
  public_case_2025: RevealedPublicCase | null;
  caveats: string[];
}

// revealed-preferences-weekly.json (research-only, never served; see
// docs/api-contracts.md). Fits are keyed by committee release identity.

export interface RevealedWeeklyFit {
  research_only: true;
  ranking_release: number | null;
  release_date: string | null;
  source: string | null;
  games_through_week: number;
  fitted_weights: FittedWeights;
  baseline_delta_pp: Record<string, Record<string, number> | null>;
  prior_release_delta_pp: Record<string, number> | null;
  fit_quality: {
    rank_error: number | null;
    spearman_top12: number | null;
    baseline_rank_error: number | null;
  };
  confidence: "directional" | "moderate" | "high";
  warning_badges: string[];
}

export interface RevealedSeasonVolatility {
  releases_compared: number;
  mean_abs_shift_pp: Record<string, number>;
  max_abs_shift_pp: Record<string, number>;
  volatility_note: string | null;
}

export interface RevealedWeeklySeason {
  season: number;
  takeaway: string;
  warning_badges: string[];
  weekly_fits: RevealedWeeklyFit[];
  volatility: RevealedSeasonVolatility;
}

export interface RevealedWeeklyPayload {
  schema_version: 1;
  research_only: true;
  generated_at: string;
  production_baseline: FittedWeights;
  disclaimer: string;
  disclaimer_short: string;
  badge_explainers: Record<string, string>;
  seasons: RevealedWeeklySeason[];
  caveats: string[];
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
