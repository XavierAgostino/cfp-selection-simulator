"""Map API contract payloads to DuckDB row dicts."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import pandas as pd

from src import __version__
from src.api_contracts.models import (
    AuditPayload,
    BracketPayload,
    FieldPayload,
    RankingsPayload,
    SensitivityPayload,
    TeamResumesPayload,
    TeamSlot,
)
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import BASE_SCENARIO_ID, RunOutputPaths, build_run_label, run_id


def _json(value: Any) -> str:
    if value is None:
        return "null"
    return json.dumps(value)


def map_run_row(
    config: SimulatorConfig,
    paths: RunOutputPaths,
    *,
    data_source: str,
    champion_source: str,
    generated_at: str,
    has_bracket: bool,
    has_sensitivity: bool,
    record_meta: Optional[dict],
    weights: Dict[str, float],
) -> dict[str, Any]:
    fmt = config.playoff_format
    return {
        "stem": paths.stem,
        "run_id": run_id(config.year, config.week),
        "scenario_id": BASE_SCENARIO_ID,
        "label": build_run_label(config.year, config.week, BASE_SCENARIO_ID),
        "season": config.year,
        "week": config.week,
        "ruleset": fmt.name if fmt else None,
        "seeding_mode": fmt.seeding if fmt else None,
        "data_source": data_source,
        "champion_source": champion_source,
        "config_hash": config.config_hash,
        "simulator_version": __version__,
        "generated_at": generated_at,
        "has_bracket": has_bracket,
        "has_sensitivity": has_sensitivity,
        "weights": _json(weights),
        "record_meta": _json(record_meta) if record_meta else None,
    }


def map_run_row_from_index(entry: dict[str, Any], record_meta: Optional[dict]) -> dict[str, Any]:
    return {
        "stem": entry["stem"],
        "run_id": entry["run_id"],
        "scenario_id": entry["scenario_id"],
        "label": entry["label"],
        "season": entry["season"],
        "week": entry["week"],
        "ruleset": entry.get("ruleset"),
        "seeding_mode": None,
        "data_source": entry["data_source"],
        "champion_source": entry.get("champion_source", "unknown"),
        "config_hash": entry["config_hash"],
        "simulator_version": entry.get("simulator_version", ""),
        "generated_at": entry["generated_at"],
        "has_bracket": entry.get("has_bracket", False),
        "has_sensitivity": entry.get("has_sensitivity", False),
        "weights": _json(entry.get("weights", {})),
        "record_meta": _json(record_meta) if record_meta else None,
    }


def map_rankings(payload: RankingsPayload, run_stem: str) -> List[dict[str, Any]]:
    rows: List[dict[str, Any]] = []
    for team in payload.teams:
        rows.append(
            {
                "run_stem": run_stem,
                "rank": team.rank,
                "team": team.team,
                "abbreviation": team.abbreviation,
                "conference": team.conference,
                "composite_score": team.composite_score,
                "resume_score": team.resume_score,
                "predictive_score": team.predictive_score,
                "sor": team.sor,
                "sos": team.sos,
                "is_conference_champion": team.is_conference_champion,
                "champion_of": team.champion_of,
                "record_wins": team.record.wins,
                "record_losses": team.record.losses,
                "in_field": team.in_field,
                "bid_type": team.bid_type,
                "seed": team.seed,
                "logo_url": team.logo_url,
                "primary_color": team.primary_color,
                "secondary_color": team.secondary_color,
            }
        )
    return rows


def _slot_row(run_stem: str, slot: TeamSlot) -> dict[str, Any]:
    return {
        "run_stem": run_stem,
        "seed": slot.seed,
        "rank": slot.rank,
        "team": slot.team,
        "bid_type": slot.bid_type,
        "is_bye": slot.is_bye,
        "composite_score": slot.composite_score,
    }


def map_field(payload: FieldPayload, run_stem: str) -> tuple[List[dict], List[dict]]:
    slots = [_slot_row(run_stem, s) for s in payload.field if s.seed is not None]
    bubble: List[dict[str, Any]] = []
    for tier, teams in (
        ("auto_bids", payload.auto_bids),
        ("at_large_bids", payload.at_large_bids),
        ("first_four_out", payload.first_four_out),
        ("next_four_out", payload.next_four_out),
    ):
        for team in teams:
            bubble.append(
                {
                    "run_stem": run_stem,
                    "tier": tier,
                    "rank": team.rank,
                    "team": team.team,
                    "composite_score": team.composite_score,
                }
            )
    return slots, bubble


def map_bracket(payload: BracketPayload, run_stem: str) -> tuple[List[dict], List[dict]]:
    pods: List[dict[str, Any]] = []
    for pod in payload.pods:
        pods.append(
            {
                "run_stem": run_stem,
                "pod_id": pod.pod_id,
                "quarterfinal_id": pod.quarterfinal_id,
                "semifinal_side": pod.semifinal_side,
                "bye_team": pod.bye.team,
                "bye_seed": pod.bye.seed if pod.bye.seed is not None else 0,
                "pod_json": _json(pod.model_dump()),
            }
        )

    rounds: List[dict[str, Any]] = []
    game_num = 0
    for game in payload.rounds.first_round:
        game_num += 1
        rounds.append(
            {
                "run_stem": run_stem,
                "round": "first_round",
                "game_num": game_num,
                "game_id": game.game_id,
                "team_a": game.team_a.team,
                "team_b": game.team_b.team,
                "seed_a": game.team_a.seed,
                "seed_b": game.team_b.seed,
                "bye_team": None,
                "feeds_from": None,
                "winner_to_seed": game.winner_to_seed,
                "side": None,
                "pods": None,
            }
        )
    for idx, game in enumerate(payload.rounds.quarterfinals, start=1):
        rounds.append(
            {
                "run_stem": run_stem,
                "round": "quarterfinal",
                "game_num": idx,
                "game_id": game.game_id,
                "team_a": None,
                "team_b": None,
                "seed_a": None,
                "seed_b": None,
                "bye_team": game.bye_team.team,
                "feeds_from": game.feeds_from,
                "winner_to_seed": None,
                "side": None,
                "pods": None,
            }
        )
    for idx, group in enumerate(payload.rounds.semifinals, start=1):
        rounds.append(
            {
                "run_stem": run_stem,
                "round": "semifinal",
                "game_num": idx,
                "game_id": None,
                "team_a": None,
                "team_b": None,
                "seed_a": None,
                "seed_b": None,
                "bye_team": None,
                "feeds_from": None,
                "winner_to_seed": None,
                "side": group.side,
                "pods": _json(group.pods),
            }
        )
    rounds.append(
        {
            "run_stem": run_stem,
            "round": "championship",
            "game_num": 1,
            "game_id": None,
            "team_a": None,
            "team_b": None,
            "seed_a": None,
            "seed_b": None,
            "bye_team": None,
            "feeds_from": None,
            "winner_to_seed": None,
            "side": None,
            "pods": None,
        }
    )
    return pods, rounds


def map_audit(payload: AuditPayload, run_stem: str) -> List[dict[str, Any]]:
    phase_by_step = {phase.step: phase.messages for phase in payload.phases}
    rows: List[dict[str, Any]] = []
    for idx, step in enumerate(payload.steps):
        rows.append(
            {
                "run_stem": run_stem,
                "step_index": idx,
                "step": step.step,
                "message": step.message,
                "phase_messages": _json(phase_by_step.get(step.step)),
            }
        )
    return rows


def map_team_resumes(payload: TeamResumesPayload, run_stem: str) -> tuple[List[dict], List[dict]]:
    resume_rows: List[dict[str, Any]] = []
    schedule_rows: List[dict[str, Any]] = []
    for resume in payload.teams.values():
        resume_rows.append(
            {
                "run_stem": run_stem,
                "team": resume.team,
                "rank": resume.rank,
                "seed": resume.seed,
                "bid_type": resume.bid_type,
                "in_field": resume.in_field,
                "detail_level": resume.detail_level,
                "conference": resume.conference,
                "abbreviation": resume.abbreviation,
                "is_conference_champion": resume.is_conference_champion,
                "champion_of": resume.champion_of,
                "record_wins": resume.record.wins,
                "record_losses": resume.record.losses,
                "composite_score": resume.scores.composite,
                "resume_score": resume.scores.resume,
                "predictive_score": resume.scores.predictive,
                "sor_score": resume.scores.sor,
                "sos_score": resume.scores.sos,
                "component_rank_resume": resume.component_ranks.resume,
                "component_rank_predictive": resume.component_ranks.predictive,
                "component_rank_sor": resume.component_ranks.sor,
                "component_rank_sos": resume.component_ranks.sos,
                "selection_case": (
                    _json(resume.selection_case.model_dump()) if resume.selection_case else None
                ),
                "why_in": _json(resume.why_in),
                "concerns": _json(resume.concerns),
            }
        )
        for game in resume.schedule:
            schedule_rows.append(
                {
                    "run_stem": run_stem,
                    "team": resume.team,
                    "week": game.week,
                    "opponent": game.opponent,
                    "opponent_rank": game.opponent_rank,
                    "location": game.location,
                    "result": game.result,
                    "points_for": game.points_for,
                    "points_against": game.points_against,
                }
            )
    return resume_rows, schedule_rows


def map_sensitivity(payload: SensitivityPayload, run_stem: str) -> List[dict[str, Any]]:
    rows: List[dict[str, Any]] = []
    for team in payload.teams:
        rows.append(
            {
                "run_stem": run_stem,
                "team": team.team,
                "abbreviation": team.abbreviation,
                "selection_frequency": team.selection_frequency,
                "in_field_count": team.in_field_count,
                "n_scenarios": team.n_scenarios,
                "base_rank": team.base_rank,
                "base_seed": team.base_seed,
                "base_selected": team.base_selected,
                "base_status": team.base_status,
                "status": team.status,
                "median_rank": team.median_rank,
                "most_common_outcome": team.most_common_outcome,
                "primary_risk": team.primary_risk,
            }
        )
    return rows


def map_record_games(record_games_df: pd.DataFrame, run_stem: str) -> List[dict[str, Any]]:
    if record_games_df is None or record_games_df.empty:
        return []
    rows: List[dict[str, Any]] = []
    for _, row in record_games_df.iterrows():
        game_id = int(row.get("game_id", 0))
        rows.append(
            {
                "run_stem": run_stem,
                "game_id": game_id,
                "week": int(row["week"]),
                "home_team": str(row["home_team"]),
                "away_team": str(row["away_team"]),
                "home_score": int(row["home_score"]),
                "away_score": int(row["away_score"]),
                "neutral_site": bool(row.get("neutral_site", False)),
            }
        )
    return rows


def rows_to_dataframe(rows: List[dict[str, Any]]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows)
