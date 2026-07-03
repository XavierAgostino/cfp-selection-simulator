"""Pydantic v2 models for the Selection Room JSON API contract.

Source of truth for docs/api-contracts.md — keep that doc in sync with this
module. Field names are snake_case on the wire; the Next.js app consumes them
verbatim (no camelCase mapping layer).
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, RootModel

from src.api_contracts import SCHEMA_VERSION

BidType = Literal["auto", "at_large"]
Ruleset = Literal["2024", "2025_plus"]
SeedingMode = Literal["champion_byes", "straight"]
DataSource = Literal["cfbd", "sample"]
AssetsSource = Literal["cache", "sample"]
Location = Literal["home", "away", "neutral"]
Result = Literal["W", "L"]
SemifinalSide = Literal["top", "bottom"]
StabilityStatus = Literal["lock", "likely_in", "bubble", "likely_out", "out"]
StabilityBaseStatus = Literal["in_field", "first_out", "next_out", "out"]
StabilityOutcome = Literal["in_field", "first_out", "out"]
StabilityRisk = Literal["none", "weight_sensitivity", "auto_bid_displacement", "composite_gap"]
RecordLabel = Literal["fbs_record", "demo_record", "model_window_record"]
DetailLevel = Literal["summary", "full"]


class Record(BaseModel):
    wins: int
    losses: int


class TeamSlot(BaseModel):
    """Shared team representation used across field/bracket/rankings payloads."""

    seed: Optional[int] = None
    rank: int
    team: str
    abbreviation: Optional[str] = None
    conference: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    bid_type: Optional[BidType] = None
    is_bye: bool = False
    composite_score: float
    resume_score: float
    predictive_score: float
    sor: float
    sos: float
    record: Record


# --- runs.json ---------------------------------------------------------------


class RunsIndexEntry(BaseModel):
    stem: str
    run_id: str
    scenario_id: str
    season: int
    week: int
    ruleset: Optional[Ruleset] = None
    data_source: DataSource
    champion_source: str
    generated_at: str
    has_bracket: bool
    has_sensitivity: bool = False
    simulator_version: str
    config_hash: str
    weights: Dict[str, float]
    label: str


class LatestRef(BaseModel):
    season: int
    week: int
    stem: str


class RunsIndex(BaseModel):
    schema_version: int = SCHEMA_VERSION
    generated_at: str
    latest: Optional[LatestRef] = None
    runs: List[RunsIndexEntry] = Field(default_factory=list)


# --- latest.json ---------------------------------------------------------------


class RecordMeta(BaseModel):
    record_universe: Literal["fbs"] = "fbs"
    record_game_scope: Literal["display"] = "display"
    model_start_week: int
    record_start_week: int
    through_week: int
    includes_ccg: bool
    data_source: DataSource
    is_demo_fixture: bool
    record_label: RecordLabel


class LatestMeta(BaseModel):
    schema_version: int = SCHEMA_VERSION
    product: str = "Selection Room"
    simulator_version: str
    season: int
    week: int
    stem: str
    ruleset: Optional[Ruleset] = None
    seeding_mode: Optional[SeedingMode] = None
    bye_rule: Optional[str] = None
    data_source: DataSource
    champion_source: str
    config_hash: str
    generated_at: str
    assets_source: AssetsSource
    weights: Dict[str, float]
    counts: Dict[str, int]
    has_bracket: bool
    record_meta: Optional[RecordMeta] = None


# --- rankings.json ---------------------------------------------------------------


class RankingsTeam(BaseModel):
    rank: int
    team: str
    abbreviation: Optional[str] = None
    conference: Optional[str] = None
    composite_score: float
    resume_score: float
    predictive_score: float
    sor: float
    sos: float
    is_conference_champion: bool
    champion_of: Optional[str] = None
    record: Record
    in_field: bool
    bid_type: Optional[BidType] = None
    seed: Optional[int] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


class RankingsPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    generated_at: str
    record_meta: Optional[RecordMeta] = None
    teams: List[RankingsTeam] = Field(default_factory=list)


# --- field.json ---------------------------------------------------------------


class FieldPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    ruleset: Optional[Ruleset] = None
    seeding_mode: Optional[SeedingMode] = None
    field: List[TeamSlot] = Field(default_factory=list)
    auto_bids: List[TeamSlot] = Field(default_factory=list)
    at_large_bids: List[TeamSlot] = Field(default_factory=list)
    last_four_in: List[TeamSlot] = Field(default_factory=list)
    first_four_out: List[TeamSlot] = Field(default_factory=list)
    next_four_out: List[TeamSlot] = Field(default_factory=list)
    displaced_team: Optional[TeamSlot] = None
    champ_pulled_in: bool = False


# --- bracket.json ---------------------------------------------------------------


class BracketPod(BaseModel):
    pod_id: str
    first_round: List[TeamSlot]
    bye: TeamSlot
    quarterfinal_id: str
    semifinal_side: SemifinalSide


class FirstRoundGame(BaseModel):
    game_id: str
    team_a: TeamSlot
    team_b: TeamSlot
    winner_to_seed: int


class QuarterfinalGame(BaseModel):
    game_id: str
    bye_team: TeamSlot
    feeds_from: str


class SemifinalGroup(BaseModel):
    side: SemifinalSide
    pods: List[str]


class Championship(BaseModel):
    label: str = "CFP National Championship"


class BracketRounds(BaseModel):
    first_round: List[FirstRoundGame]
    quarterfinals: List[QuarterfinalGame]
    semifinals: List[SemifinalGroup]
    championship: Championship = Field(default_factory=Championship)


class BracketPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    ruleset: Optional[Ruleset] = None
    seeding_mode: Optional[SeedingMode] = None
    pods: List[BracketPod]
    rounds: BracketRounds


# --- audit.json ---------------------------------------------------------------


class AuditStepEntry(BaseModel):
    step: str
    message: str


class AuditPhase(BaseModel):
    step: str
    messages: List[str]


class AuditPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    ruleset: Optional[Ruleset] = None
    steps: List[AuditStepEntry] = Field(default_factory=list)
    phases: List[AuditPhase] = Field(default_factory=list)
    log: List[str] = Field(default_factory=list)
    displaced_team: Optional[str] = None
    first_four_out: List[str] = Field(default_factory=list)


# --- team-resumes.json ---------------------------------------------------------------


class ScheduleGame(BaseModel):
    week: int
    opponent: str
    opponent_rank: Optional[int] = None
    location: Location
    result: Result
    points_for: int
    points_against: int


class TeamResumeScores(BaseModel):
    composite: float
    resume: float
    predictive: float
    sor: float
    sos: float


class ComponentRanks(BaseModel):
    resume: int
    predictive: int
    sor: int
    sos: int


SelectionCaseStatus = Literal["selected", "out", "bubble", "summary"]


class SelectionCase(BaseModel):
    status: SelectionCaseStatus
    headline: str
    reasons: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)


class TeamResume(BaseModel):
    team: str
    abbreviation: Optional[str] = None
    conference: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    rank: int
    seed: Optional[int] = None
    bid_type: Optional[BidType] = None
    in_field: bool
    is_conference_champion: bool
    champion_of: Optional[str] = None
    record: Record
    scores: TeamResumeScores
    component_ranks: ComponentRanks
    detail_level: DetailLevel = "full"
    selection_case: Optional[SelectionCase] = None
    why_in: List[str] = Field(default_factory=list)
    concerns: List[str] = Field(default_factory=list)
    schedule: List[ScheduleGame] = Field(default_factory=list)


class TeamResumesPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    generated_at: str
    record_meta: Optional[RecordMeta] = None
    teams: Dict[str, TeamResume] = Field(default_factory=dict)


# --- sensitivity.json ---------------------------------------------------------------


class PerturbationSpec(BaseModel):
    method: str = "uniform_relative_weight_perturbation"
    relative_range: float
    base_weights: Dict[str, float]


class BaseFieldCutoff(BaseModel):
    """Links Selection Stability to the deterministic cut line so the UI can
    cross-reference without recomputing."""

    final_at_large_team: Optional[str] = None
    final_at_large_score: Optional[float] = None
    first_team_out: Optional[str] = None
    first_team_out_score: Optional[float] = None


class SelectionStabilityTeam(BaseModel):
    team: str
    abbreviation: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    selection_frequency: float
    in_field_count: int
    n_scenarios: int
    base_rank: int
    base_seed: Optional[int] = None
    base_selected: bool
    base_status: StabilityBaseStatus
    status: StabilityStatus
    median_rank: int
    most_common_outcome: StabilityOutcome
    primary_risk: StabilityRisk


class SensitivityPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    season: int
    week: int
    ruleset: Optional[Ruleset] = None
    generated_at: str
    n_scenarios: int
    random_seed: int
    perturbation_spec: PerturbationSpec
    base_field_cutoff: BaseFieldCutoff
    teams: List[SelectionStabilityTeam] = Field(default_factory=list)


# --- validation.json ----------------------------------------------------------------
#
# Repo-level (not per-run) historical validation of the model against the real
# CFP committee across a span of seasons. Optional artifact: absent until
# `sroom validate` runs over historical seasons. Never speaks in win-probability
# terms — this measures how the model *differs from* the committee.


class CommitteeValidationRow(BaseModel):
    """Per-season committee replication (how closely the model reproduces the
    committee's top-25/top-12 ordering)."""

    year: int
    spearman_top25: Optional[float] = None
    spearman_top12: Optional[float] = None
    top12_overlap_ratio: float
    top12_overlap_label: str
    bubble_overlap_ratio: float
    bubble_overlap_label: str
    is_outlier: bool = False
    notes: str = ""


class SelectionValidationRow(BaseModel):
    """Per-season era-correct field selection (does the model pick the right
    bracket under that season's actual playoff format)."""

    year: int
    era: str
    ruleset: str
    rule_target: str
    field_overlap_ratio: float
    field_overlap_label: str
    correct_field_size: bool
    false_positives: List[str] = Field(default_factory=list)
    false_negatives: List[str] = Field(default_factory=list)
    first_team_out_match: Optional[bool] = None
    first_team_out_ref: Optional[str] = None
    first_team_out_sim: Optional[str] = None
    displacement_count: int = 0
    seeding_exact_match: Optional[float] = None
    seeding_within_one: Optional[float] = None
    is_outlier: bool = False
    notes: str = ""


class PredictiveValidationRow(BaseModel):
    """Per-season predictive forecasting accuracy (game outcomes/margins)."""

    year: int
    model: str
    brier_score: float
    win_accuracy: float
    margin_mae: float
    margin_rmse: float


class CommitteeSummary(BaseModel):
    seasons: int
    mean_spearman_top12: Optional[float] = None
    mean_top12_overlap: Optional[float] = None
    mean_bubble_overlap: Optional[float] = None


class SelectionSummary(BaseModel):
    seasons: int
    correct_field_rate: Optional[float] = None
    mean_field_overlap: Optional[float] = None
    first_team_out_match_rate: Optional[float] = None
    mean_seeding_within_one: Optional[float] = None


class PredictiveSummary(BaseModel):
    seasons: int
    mean_brier: Optional[float] = None
    mean_win_accuracy: Optional[float] = None
    mean_margin_mae: Optional[float] = None


class ValidationSummary(BaseModel):
    committee: Optional[CommitteeSummary] = None
    selection: Optional[SelectionSummary] = None
    predictive: Optional[PredictiveSummary] = None


class ValidationPayload(BaseModel):
    schema_version: int = SCHEMA_VERSION
    generated_at: str
    years: List[int] = Field(default_factory=list)
    target: str = "all"
    outlier_years: List[int] = Field(default_factory=list)
    summary: ValidationSummary = Field(default_factory=ValidationSummary)
    committee: List[CommitteeValidationRow] = Field(default_factory=list)
    selection: List[SelectionValidationRow] = Field(default_factory=list)
    predictive: List[PredictiveValidationRow] = Field(default_factory=list)


# --- team-assets.json ---------------------------------------------------------------


class TeamAssetEntry(BaseModel):
    cfbd_id: Optional[int] = None
    espn_id: Optional[int] = None
    abbreviation: str = ""
    conference: str = ""
    logo: Optional[str] = None
    logo_source: str = "placeholder"
    primary_color: str = "#667eea"
    secondary_color: str = "#333333"


class TeamAssetsPayload(RootModel[Dict[str, TeamAssetEntry]]):
    """Flat passthrough of ``load_team_assets()`` — no schema_version wrapper,
    keyed by team name, per docs/api-contracts.md."""
