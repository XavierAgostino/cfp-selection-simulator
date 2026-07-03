"""Builders: engine objects (DataFrames, PlayoffSelection, bracket pods) -> API
contract pydantic models (src.api_contracts.models).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Optional, Union

import pandas as pd

from src.api_contracts.models import (
    AuditPayload,
    AuditPhase,
    AuditStepEntry,
    BaseFieldCutoff,
    BracketPayload,
    BracketPod,
    BracketRounds,
    Championship,
    CommitteeSummary,
    CommitteeValidationRow,
    ComponentRanks,
    FieldPayload,
    FirstRoundGame,
    PerturbationSpec,
    PredictiveSummary,
    PredictiveValidationRow,
    QuarterfinalGame,
    RankingsPayload,
    RankingsTeam,
    Record,
    RecordMeta,
    RunsIndexEntry,
    ScheduleGame,
    SelectionCase,
    SelectionStabilityTeam,
    SelectionSummary,
    SelectionValidationRow,
    SemifinalGroup,
    SensitivityPayload,
    TeamResume,
    TeamResumeScores,
    TeamResumesPayload,
    TeamSlot,
    ValidationPayload,
    ValidationSummary,
)
from src.api_contracts.selection_case import build_selection_case
from src.assets.logos import get_team_logo_url
from src.assets.teams import TeamAsset, get_team_asset
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import BASE_SCENARIO_ID, build_run_label, component_weights, run_id
from src.playoff.bracket_view import build_bracket_pods, build_bracket_rounds
from src.selection.audit import AuditStep
from src.selection.field import PlayoffSelection

TEAM_RESUME_TOP_N = 40

RowLike = Union[Mapping[str, Any], "pd.Series[Any]"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def team_records_from_games(games_df: Optional[pd.DataFrame]) -> Dict[str, Dict[str, int]]:
    """Compute {team: {wins, losses}} from raw game results.

    The rankings DataFrame carries no win/loss columns (and the seeded CSV
    defaults wins/losses to 0), so records must always be derived from games.
    """
    if games_df is None or games_df.empty:
        return {}
    teams = sorted(set(games_df["home_team"].unique()) | set(games_df["away_team"].unique()))
    records: Dict[str, Dict[str, int]] = {}
    for team in teams:
        tg = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
        wins = int(
            ((tg["home_team"] == team) & (tg["home_score"] > tg["away_score"])).sum()
            + ((tg["away_team"] == team) & (tg["away_score"] > tg["home_score"])).sum()
        )
        records[team] = {"wins": wins, "losses": int(len(tg) - wins)}
    return records


def component_ranks_by_team(rankings_df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
    """Rank each team 1..N (best=1) within each score component, across all teams."""
    result: Dict[str, Dict[str, int]] = {team: {} for team in rankings_df["team"]}
    for col, key in (
        ("resume_score", "resume"),
        ("predictive_score", "predictive"),
        ("sor", "sor"),
        ("sos", "sos"),
    ):
        ordered = rankings_df.sort_values(col, ascending=False).reset_index(drop=True)
        for idx, row in ordered.iterrows():
            result[row["team"]][key] = idx + 1
    return result


def _seed_lookup(seeded_df: Optional[pd.DataFrame]) -> Dict[str, Dict[str, Any]]:
    if seeded_df is None or seeded_df.empty:
        return {}
    return {row["team"]: row.to_dict() for _, row in seeded_df.iterrows()}


def _bid_type_lookup(selection: Optional[PlayoffSelection]) -> Dict[str, str]:
    if selection is None:
        return {}
    lookup = {t["team"]: "auto" for t in selection.auto_bids}
    lookup.update({t["team"]: "at_large" for t in selection.at_large_bids})
    return lookup


def _is_champion(conf_champ: Any) -> bool:
    return "Yes" in str(conf_champ or "")


def _champion_of(conf_champ: Any, conference: Optional[str]) -> Optional[str]:
    label = str(conf_champ or "")
    if "Yes" not in label:
        return None
    if "(" in label:
        return label.split("(", 1)[1].rstrip(")")
    return conference


def _team_asset(team_name: str, use_sample: bool) -> Optional[TeamAsset]:
    return get_team_asset(team_name, use_sample=use_sample)


def _abbreviation(asset: Optional[TeamAsset]) -> Optional[str]:
    return asset.abbreviation if asset and asset.abbreviation else None


def _logo_url(team_name: str, use_sample: bool) -> Optional[str]:
    return get_team_logo_url(team_name, use_sample=use_sample)


def build_team_slot(
    row: RowLike,
    *,
    records: Dict[str, Dict[str, int]],
    use_sample: bool,
    bid_type_lookup: Optional[Dict[str, str]] = None,
    seed: Optional[int] = None,
    is_bye: Optional[bool] = None,
) -> TeamSlot:
    """Build a TeamSlot from any row-like mapping with rank/team/score columns.

    ``seed``/``is_bye`` override whatever is in ``row`` (used when the row
    comes from a rankings/selection dict that has no seed of its own); when
    omitted, they fall back to ``row["seed"]``/``row["is_bye"]`` for rows that
    already carry seeding info (e.g. bracket pod rows).
    """
    team_name = row["team"]
    asset = _team_asset(team_name, use_sample)

    resolved_seed = seed if seed is not None else row.get("seed")
    if resolved_seed is not None and not (
        isinstance(resolved_seed, float) and pd.isna(resolved_seed)
    ):
        resolved_seed = int(resolved_seed)
    else:
        resolved_seed = None

    resolved_is_bye = is_bye if is_bye is not None else bool(row.get("is_bye", False))
    record = records.get(team_name, {"wins": 0, "losses": 0})

    return TeamSlot(
        seed=resolved_seed,
        rank=int(row["rank"]),
        team=team_name,
        abbreviation=_abbreviation(asset),
        conference=row.get("conference"),
        logo_url=_logo_url(team_name, use_sample),
        primary_color=asset.primary_color if asset else None,
        secondary_color=asset.secondary_color if asset else None,
        bid_type=(bid_type_lookup or {}).get(team_name),
        is_bye=resolved_is_bye,
        composite_score=float(row.get("composite_score", 0.0) or 0.0),
        resume_score=float(row.get("resume_score", 0.0) or 0.0),
        predictive_score=float(row.get("predictive_score", 0.0) or 0.0),
        sor=float(row.get("sor", 0.0) or 0.0),
        sos=float(row.get("sos", 0.0) or 0.0),
        record=Record(**record),
    )


def _team_slot_from_selection_dict(
    team_dict: Dict[str, Any],
    *,
    seed_rows: Dict[str, Dict[str, Any]],
    records: Dict[str, Dict[str, int]],
    bid_type_lookup: Dict[str, str],
    use_sample: bool,
) -> TeamSlot:
    seed_row = seed_rows.get(team_dict["team"])
    seed = int(seed_row["seed"]) if seed_row is not None else None
    is_bye = bool(seed_row.get("is_bye")) if seed_row is not None else False
    return build_team_slot(
        team_dict,
        records=records,
        use_sample=use_sample,
        bid_type_lookup=bid_type_lookup,
        seed=seed,
        is_bye=is_bye,
    )


def _next_four_out(
    rankings_df: pd.DataFrame, selection: Optional[PlayoffSelection]
) -> List[Dict[str, Any]]:
    """Next 4 teams by rank after first_four_out, excluding the field."""
    if selection is None:
        return []
    excluded = {t["team"] for t in selection.playoff_teams} | {
        t["team"] for t in selection.first_four_out
    }
    pool = rankings_df[~rankings_df["team"].isin(excluded)].sort_values("rank")
    return pool.head(4).to_dict("records")


def _last_four_in(selection: Optional[PlayoffSelection]) -> List[Dict[str, Any]]:
    """4 lowest-ranked (worst) at-large bids."""
    if selection is None or not selection.at_large_bids:
        return []
    return sorted(selection.at_large_bids, key=lambda t: t["rank"], reverse=True)[:4]


def _ruleset_name(config: SimulatorConfig) -> Optional[str]:
    return config.playoff_format.name if config.playoff_format else None


def _seeding_mode(config: SimulatorConfig) -> Optional[str]:
    return config.playoff_format.seeding if config.playoff_format else None


def build_rankings_payload(
    config: SimulatorConfig,
    rankings_df: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded_df: Optional[pd.DataFrame],
    records: Dict[str, Dict[str, int]],
    use_sample: bool,
    record_meta: Optional[RecordMeta] = None,
) -> RankingsPayload:
    seed_rows = _seed_lookup(seeded_df)
    bid_lookup = _bid_type_lookup(selection)
    in_field_names = (
        {t["team"] for t in selection.playoff_teams} if selection is not None else set()
    )

    teams: List[RankingsTeam] = []
    for _, row in rankings_df.sort_values("rank").iterrows():
        team_name = row["team"]
        asset = _team_asset(team_name, use_sample)
        seed_row = seed_rows.get(team_name)
        teams.append(
            RankingsTeam(
                rank=int(row["rank"]),
                team=team_name,
                abbreviation=_abbreviation(asset),
                conference=row.get("conference"),
                composite_score=float(row.get("composite_score", 0.0)),
                resume_score=float(row.get("resume_score", 0.0)),
                predictive_score=float(row.get("predictive_score", 0.0)),
                sor=float(row.get("sor", 0.0)),
                sos=float(row.get("sos", 0.0)),
                is_conference_champion=_is_champion(row.get("conf_champ")),
                champion_of=_champion_of(row.get("conf_champ"), row.get("conference")),
                record=Record(**records.get(team_name, {"wins": 0, "losses": 0})),
                in_field=team_name in in_field_names,
                bid_type=bid_lookup.get(team_name),
                seed=int(seed_row["seed"]) if seed_row is not None else None,
                logo_url=_logo_url(team_name, use_sample),
                primary_color=asset.primary_color if asset else None,
                secondary_color=asset.secondary_color if asset else None,
            )
        )
    return RankingsPayload(
        season=config.year,
        week=config.week,
        generated_at=_now_iso(),
        record_meta=record_meta,
        teams=teams,
    )


def build_field_payload(
    config: SimulatorConfig,
    rankings_df: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded_df: Optional[pd.DataFrame],
    records: Dict[str, Dict[str, int]],
    use_sample: bool,
) -> Optional[FieldPayload]:
    if selection is None:
        return None

    seed_rows = _seed_lookup(seeded_df)
    bid_lookup = _bid_type_lookup(selection)

    def slot(team_dict: Dict[str, Any]) -> TeamSlot:
        return _team_slot_from_selection_dict(
            team_dict,
            seed_rows=seed_rows,
            records=records,
            bid_type_lookup=bid_lookup,
            use_sample=use_sample,
        )

    field_slots = sorted(
        (slot(t) for t in selection.playoff_teams),
        key=lambda s: s.seed if s.seed is not None else s.rank,
    )
    displaced = slot(selection.displaced_team) if selection.displaced_team else None

    return FieldPayload(
        season=config.year,
        week=config.week,
        ruleset=_ruleset_name(config),
        seeding_mode=_seeding_mode(config),
        field=field_slots,
        auto_bids=[slot(t) for t in selection.auto_bids],
        at_large_bids=[slot(t) for t in selection.at_large_bids],
        last_four_in=[slot(t) for t in _last_four_in(selection)],
        first_four_out=[slot(t) for t in selection.first_four_out],
        next_four_out=[slot(t) for t in _next_four_out(rankings_df, selection)],
        displaced_team=displaced,
        champ_pulled_in=selection.champ_pulled_in,
    )


def _merge_seeded_with_rankings(seeded_df: pd.DataFrame, rankings_df: pd.DataFrame) -> pd.DataFrame:
    extra_cols = ["team", "resume_score", "predictive_score", "sor", "sos"]
    extra_cols = [c for c in extra_cols if c in rankings_df.columns]
    merged = seeded_df.merge(rankings_df[extra_cols], on="team", how="left")
    for col in ("resume_score", "predictive_score", "sor", "sos"):
        if col not in merged.columns:
            merged[col] = 0.0
    return merged


def build_bracket_payload(
    config: SimulatorConfig,
    rankings_df: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded_df: Optional[pd.DataFrame],
    records: Dict[str, Dict[str, int]],
    use_sample: bool,
) -> Optional[BracketPayload]:
    if seeded_df is None or seeded_df.empty:
        return None

    merged = _merge_seeded_with_rankings(seeded_df, rankings_df)
    merged["wins"] = merged["team"].map(lambda t: records.get(t, {}).get("wins", 0))
    merged["losses"] = merged["team"].map(lambda t: records.get(t, {}).get("losses", 0))

    bid_lookup = _bid_type_lookup(selection)

    def to_slot(row_dict: Dict[str, Any]) -> TeamSlot:
        return build_team_slot(
            row_dict, records=records, use_sample=use_sample, bid_type_lookup=bid_lookup
        )

    raw_pods = build_bracket_pods(merged)
    pods = [
        BracketPod(
            pod_id=pod["pod_id"],
            first_round=[to_slot(t) for t in pod["first_round"]],
            bye=to_slot(pod["bye"]),
            quarterfinal_id=pod["quarterfinal_id"],
            semifinal_side=pod["semifinal_side"],
        )
        for pod in raw_pods
    ]

    raw_rounds = build_bracket_rounds(raw_pods)
    rounds = BracketRounds(
        first_round=[
            FirstRoundGame(
                game_id=g["game_id"],
                team_a=to_slot(g["team_a"]),
                team_b=to_slot(g["team_b"]),
                winner_to_seed=g["winner_to_seed"],
            )
            for g in raw_rounds["first_round"]
        ],
        quarterfinals=[
            QuarterfinalGame(
                game_id=q["game_id"],
                bye_team=to_slot(q["bye_team"]),
                feeds_from=q["feeds_from"],
            )
            for q in raw_rounds["quarterfinals"]
        ],
        semifinals=[
            SemifinalGroup(side=s["side"], pods=s["pods"]) for s in raw_rounds["semifinals"]
        ],
        championship=Championship(label="CFP National Championship"),
    )

    return BracketPayload(
        season=config.year,
        week=config.week,
        ruleset=_ruleset_name(config),
        seeding_mode=_seeding_mode(config),
        pods=pods,
        rounds=rounds,
    )


def build_audit_payload(
    config: SimulatorConfig, selection: Optional[PlayoffSelection]
) -> Optional[AuditPayload]:
    if selection is None:
        return None

    steps = [
        AuditStepEntry(step=entry.step.value, message=entry.message)
        for entry in selection.audit.entries
    ]

    phase_order = [
        AuditStep.FOUND_CHAMPIONS,
        AuditStep.AUTO_BIDS,
        AuditStep.AT_LARGE,
        AuditStep.DISPLACEMENT,
        AuditStep.FINAL_FIELD,
        AuditStep.FIRST_FOUR_OUT,
    ]
    grouped: Dict[AuditStep, List[str]] = {}
    for entry in selection.audit.entries:
        grouped.setdefault(entry.step, []).append(entry.message)
    phases = [
        AuditPhase(step=step.value, messages=grouped[step])
        for step in phase_order
        if step in grouped
    ]

    return AuditPayload(
        season=config.year,
        week=config.week,
        ruleset=_ruleset_name(config),
        steps=steps,
        phases=phases,
        log=selection.audit_log,
        displaced_team=selection.displaced_team["team"] if selection.displaced_team else None,
        first_four_out=[t["team"] for t in selection.first_four_out],
    )


def build_schedule(
    team_name: str, games_df: Optional[pd.DataFrame], rank_lookup: Dict[str, int]
) -> List[ScheduleGame]:
    if games_df is None or games_df.empty:
        return []
    tg = games_df[
        (games_df["home_team"] == team_name) | (games_df["away_team"] == team_name)
    ].sort_values("week")

    games: List[ScheduleGame] = []
    for _, g in tg.iterrows():
        is_home = g["home_team"] == team_name
        opponent = g["away_team"] if is_home else g["home_team"]
        neutral = bool(g.get("neutral_site", False))
        location = "neutral" if neutral else ("home" if is_home else "away")
        team_score = int(g["home_score"] if is_home else g["away_score"])
        opp_score = int(g["away_score"] if is_home else g["home_score"])
        games.append(
            ScheduleGame(
                week=int(g["week"]),
                opponent=opponent,
                opponent_rank=rank_lookup.get(opponent),
                location=location,  # type: ignore[arg-type]
                result="W" if team_score > opp_score else "L",
                points_for=team_score,
                points_against=opp_score,
            )
        )
    return games


def build_team_resumes_payload(
    config: SimulatorConfig,
    rankings_df: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded_df: Optional[pd.DataFrame],
    games_df: Optional[pd.DataFrame],
    records: Dict[str, Dict[str, int]],
    use_sample: bool,
    record_meta: Optional[RecordMeta] = None,
    stability_by_team: Optional[Dict[str, Any]] = None,
) -> TeamResumesPayload:
    comp_ranks = component_ranks_by_team(rankings_df)
    rank_lookup = {row["team"]: int(row["rank"]) for _, row in rankings_df.iterrows()}
    seed_rows = _seed_lookup(seeded_df)
    bid_lookup = _bid_type_lookup(selection)

    full_detail_names = set(rankings_df.sort_values("rank").head(TEAM_RESUME_TOP_N)["team"])
    in_field_names: set = set()
    if selection is not None:
        in_field_names = {t["team"] for t in selection.playoff_teams}
        full_detail_names |= in_field_names
        full_detail_names |= {t["team"] for t in selection.first_four_out}
        full_detail_names |= {t["team"] for t in _next_four_out(rankings_df, selection)}

    teams: Dict[str, TeamResume] = {}
    for _, row in rankings_df.iterrows():
        team_name = row["team"]
        asset = _team_asset(team_name, use_sample)
        seed_row = seed_rows.get(team_name)
        is_full = team_name in full_detail_names
        default_ranks = {"resume": 0, "predictive": 0, "sor": 0, "sos": 0}
        schedule: List[ScheduleGame] = []
        if is_full:
            schedule = build_schedule(team_name, games_df, rank_lookup)

        stability = (stability_by_team or {}).get(team_name)
        stability_status = getattr(stability, "status", None) if stability else None
        case = build_selection_case(
            team_name,
            row,
            selection,
            seeded_df,
            component_ranks=comp_ranks.get(team_name, default_ranks),
            ruleset=_ruleset_name(config),
            seeding_mode=_seeding_mode(config),
            in_field=team_name in in_field_names,
            bid_type=bid_lookup.get(team_name),
            detail_level="full" if is_full else "summary",
            record_meta=record_meta,
            stability_status=stability_status,
            rankings_df=rankings_df,
            champion_of=_champion_of(row.get("conf_champ"), row.get("conference")),
        )
        why = case.reasons
        concerns = case.concerns
        selection_case = SelectionCase(
            status=case.status,
            headline=case.headline,
            reasons=case.reasons,
            concerns=case.concerns,
        )
        teams[team_name] = TeamResume(
            team=team_name,
            abbreviation=_abbreviation(asset),
            conference=row.get("conference"),
            logo_url=_logo_url(team_name, use_sample),
            primary_color=asset.primary_color if asset else None,
            secondary_color=asset.secondary_color if asset else None,
            rank=int(row["rank"]),
            seed=int(seed_row["seed"]) if seed_row is not None else None,
            bid_type=bid_lookup.get(team_name),
            in_field=team_name in in_field_names,
            is_conference_champion=_is_champion(row.get("conf_champ")),
            champion_of=_champion_of(row.get("conf_champ"), row.get("conference")),
            record=Record(**records.get(team_name, {"wins": 0, "losses": 0})),
            scores=TeamResumeScores(
                composite=float(row.get("composite_score", 0.0)),
                resume=float(row.get("resume_score", 0.0)),
                predictive=float(row.get("predictive_score", 0.0)),
                sor=float(row.get("sor", 0.0)),
                sos=float(row.get("sos", 0.0)),
            ),
            component_ranks=ComponentRanks(**comp_ranks.get(team_name, default_ranks)),
            detail_level="full" if is_full else "summary",
            selection_case=selection_case,
            why_in=why,
            concerns=concerns,
            schedule=schedule,
        )

    return TeamResumesPayload(
        season=config.year,
        week=config.week,
        generated_at=_now_iso(),
        record_meta=record_meta,
        teams=teams,
    )


def build_sensitivity_payload(
    config: SimulatorConfig,
    sensitivity_result,
    seeded_df: Optional[pd.DataFrame],
    use_sample: bool,
) -> SensitivityPayload:
    """Map a SensitivityResult (src.validation.sensitivity) to the JSON contract."""
    seed_rows = _seed_lookup(seeded_df)

    teams: List[SelectionStabilityTeam] = []
    for entry in sensitivity_result.teams:
        asset = _team_asset(entry.team, use_sample)
        seed_row = seed_rows.get(entry.team)
        teams.append(
            SelectionStabilityTeam(
                team=entry.team,
                abbreviation=_abbreviation(asset),
                logo_url=_logo_url(entry.team, use_sample),
                primary_color=asset.primary_color if asset else None,
                selection_frequency=entry.selection_frequency,
                in_field_count=entry.in_field_count,
                n_scenarios=entry.n_scenarios,
                base_rank=entry.base_rank,
                base_seed=int(seed_row["seed"]) if seed_row is not None else None,
                base_selected=entry.base_selected,
                base_status=entry.base_status,
                status=entry.status,
                median_rank=entry.median_rank,
                most_common_outcome=entry.most_common_outcome,
                primary_risk=entry.primary_risk,
            )
        )

    return SensitivityPayload(
        season=config.year,
        week=config.week,
        ruleset=_ruleset_name(config),
        generated_at=_now_iso(),
        n_scenarios=sensitivity_result.n_scenarios,
        random_seed=sensitivity_result.random_seed,
        perturbation_spec=PerturbationSpec(
            relative_range=sensitivity_result.relative_range,
            base_weights=sensitivity_result.base_weights,
        ),
        base_field_cutoff=BaseFieldCutoff(**sensitivity_result.base_field_cutoff),
        teams=teams,
    )


def _mean(values: List[Optional[float]]) -> Optional[float]:
    """Mean of the non-None values, rounded to 4 dp; None if the list is empty."""
    present = [v for v in values if v is not None]
    if not present:
        return None
    return round(sum(present) / len(present), 4)


def _rate(flags: List[Optional[bool]]) -> Optional[float]:
    """Share of True among the non-None booleans; None if none are present."""
    present = [b for b in flags if b is not None]
    if not present:
        return None
    return round(sum(1 for b in present if b) / len(present), 4)


def build_validation_payload(
    committee: List[Any],
    selection: List[Any],
    predictive: List[Any],
    *,
    years: List[int],
    target: str,
    outlier_years: List[int],
) -> ValidationPayload:
    """Map the three historical validation result lists (from
    src.validation.*) to the repo-level validation.json contract.

    Pure transform — no IO, no live data. Accepts the dataclass result objects
    produced by run_era_validation and aggregates per-track summaries.
    """
    outliers = set(outlier_years)

    committee_rows = [
        CommitteeValidationRow(
            year=r.year,
            spearman_top25=r.spearman_top25,
            spearman_top12=r.spearman_top12,
            top12_overlap_ratio=r.top12_overlap_ratio,
            top12_overlap_label=r.top12_overlap_label,
            bubble_overlap_ratio=r.bubble_overlap_ratio,
            bubble_overlap_label=r.bubble_overlap_label,
            is_outlier=bool(getattr(r, "is_outlier", r.year in outliers)),
            notes=r.notes or "",
        )
        for r in committee
    ]

    selection_rows = [
        SelectionValidationRow(
            year=r.year,
            era=r.era,
            ruleset=r.ruleset,
            rule_target=r.rule_target,
            field_overlap_ratio=r.field_overlap_ratio,
            field_overlap_label=r.field_overlap_label,
            correct_field_size=bool(r.correct_field_size),
            false_positives=list(r.false_positives or []),
            false_negatives=list(r.false_negatives or []),
            first_team_out_match=r.first_team_out_match,
            first_team_out_ref=r.first_team_out_ref,
            first_team_out_sim=r.first_team_out_sim,
            displacement_count=r.displacement_count,
            seeding_exact_match=r.seeding_exact_match,
            seeding_within_one=r.seeding_within_one,
            is_outlier=r.year in outliers,
            notes=r.notes or "",
        )
        for r in selection
    ]

    predictive_rows = [
        PredictiveValidationRow(
            year=r.year,
            model=r.model,
            brier_score=r.brier_score,
            win_accuracy=r.win_accuracy,
            margin_mae=r.margin_mae,
            margin_rmse=r.margin_rmse,
        )
        for r in predictive
    ]

    # Summary aggregation mirrors the CSV/Markdown reports (src.validation.reports):
    # committee/selection means exclude outlier seasons, and the predictive headline
    # covers composite rows only — never a blend across baseline models.
    summary = ValidationSummary()
    if committee_rows:
        included = [r for r in committee_rows if not r.is_outlier]
        summary.committee = CommitteeSummary(
            seasons=len(included),
            mean_spearman_top12=_mean([r.spearman_top12 for r in included]),
            mean_top12_overlap=_mean([r.top12_overlap_ratio for r in included]),
            mean_bubble_overlap=_mean([r.bubble_overlap_ratio for r in included]),
        )
    if selection_rows:
        included_sel = [r for r in selection_rows if not r.is_outlier]
        summary.selection = SelectionSummary(
            seasons=len(included_sel),
            correct_field_rate=_rate([r.correct_field_size for r in included_sel]),
            mean_field_overlap=_mean([r.field_overlap_ratio for r in included_sel]),
            first_team_out_match_rate=_rate([r.first_team_out_match for r in included_sel]),
            mean_seeding_within_one=_mean([r.seeding_within_one for r in included_sel]),
        )
    if predictive_rows:
        composite_rows = [r for r in predictive_rows if r.model == "composite"]
        summary.predictive = PredictiveSummary(
            seasons=len(composite_rows),
            mean_brier=_mean([r.brier_score for r in composite_rows]),
            mean_win_accuracy=_mean([r.win_accuracy for r in composite_rows]),
            mean_margin_mae=_mean([r.margin_mae for r in composite_rows]),
        )

    # Only surface outlier seasons that are actually in this run's range — the
    # global OUTLIER_YEARS constant may name seasons that weren't validated here.
    validated_years = set(years)
    return ValidationPayload(
        generated_at=_now_iso(),
        years=sorted(validated_years),
        target=target,
        outlier_years=sorted(outliers & validated_years),
        summary=summary,
        committee=committee_rows,
        selection=selection_rows,
        predictive=predictive_rows,
    )


def build_runs_index_entry(
    config: SimulatorConfig,
    *,
    stem: str,
    data_source: str,
    champion_source: str,
    generated_at: str,
    has_bracket: bool,
    has_sensitivity: bool,
    simulator_version: str,
    scenario_id: str = BASE_SCENARIO_ID,
) -> RunsIndexEntry:
    rid = run_id(config.year, config.week)
    return RunsIndexEntry(
        stem=stem,
        run_id=rid,
        scenario_id=scenario_id,
        season=config.year,
        week=config.week,
        ruleset=_ruleset_name(config),  # type: ignore[arg-type]
        data_source=data_source,  # type: ignore[arg-type]
        champion_source=champion_source,
        generated_at=generated_at,
        has_bracket=has_bracket,
        has_sensitivity=has_sensitivity,
        simulator_version=simulator_version,
        config_hash=config.config_hash,
        weights=component_weights(config.weights),
        label=build_run_label(config.year, config.week, scenario_id),
    )
