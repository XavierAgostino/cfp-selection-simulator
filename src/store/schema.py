"""DuckDB schema for the run store."""

from __future__ import annotations

from datetime import datetime, timezone

import duckdb

STORE_SCHEMA_VERSION = 1

RUN_TABLES = (
    "record_games",
    "team_schedule",
    "team_resumes",
    "sensitivity_teams",
    "audit_steps",
    "bracket_rounds",
    "bracket_pods",
    "field_bubble",
    "field_slots",
    "rankings",
)


def ensure_schema(conn: duckdb.DuckDBPyConnection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS store_meta (
            schema_version INTEGER NOT NULL,
            migrated_at VARCHAR NOT NULL
        )
        """
    )
    row = conn.execute(
        "SELECT schema_version FROM store_meta ORDER BY migrated_at DESC LIMIT 1"
    ).fetchone()
    if row is None:
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO store_meta (schema_version, migrated_at) VALUES (?, ?)",
            [STORE_SCHEMA_VERSION, now],
        )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS runs (
            stem VARCHAR PRIMARY KEY,
            run_id VARCHAR NOT NULL,
            scenario_id VARCHAR NOT NULL,
            label VARCHAR NOT NULL,
            season INTEGER NOT NULL,
            week INTEGER NOT NULL,
            ruleset VARCHAR,
            seeding_mode VARCHAR,
            data_source VARCHAR NOT NULL,
            champion_source VARCHAR NOT NULL,
            config_hash VARCHAR NOT NULL,
            simulator_version VARCHAR NOT NULL,
            generated_at VARCHAR NOT NULL,
            has_bracket BOOLEAN NOT NULL,
            has_sensitivity BOOLEAN NOT NULL,
            weights JSON NOT NULL,
            record_meta JSON
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rankings (
            run_stem VARCHAR NOT NULL,
            rank INTEGER NOT NULL,
            team VARCHAR NOT NULL,
            abbreviation VARCHAR,
            conference VARCHAR,
            composite_score DOUBLE NOT NULL,
            resume_score DOUBLE NOT NULL,
            predictive_score DOUBLE NOT NULL,
            sor DOUBLE NOT NULL,
            sos DOUBLE NOT NULL,
            is_conference_champion BOOLEAN NOT NULL,
            champion_of VARCHAR,
            record_wins INTEGER NOT NULL,
            record_losses INTEGER NOT NULL,
            in_field BOOLEAN NOT NULL,
            bid_type VARCHAR,
            seed INTEGER,
            logo_url VARCHAR,
            primary_color VARCHAR,
            secondary_color VARCHAR,
            PRIMARY KEY (run_stem, team)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS field_slots (
            run_stem VARCHAR NOT NULL,
            seed INTEGER NOT NULL,
            rank INTEGER NOT NULL,
            team VARCHAR NOT NULL,
            bid_type VARCHAR,
            is_bye BOOLEAN NOT NULL,
            composite_score DOUBLE NOT NULL,
            PRIMARY KEY (run_stem, seed)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS field_bubble (
            run_stem VARCHAR NOT NULL,
            tier VARCHAR NOT NULL,
            rank INTEGER NOT NULL,
            team VARCHAR NOT NULL,
            composite_score DOUBLE NOT NULL,
            PRIMARY KEY (run_stem, tier, rank)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bracket_pods (
            run_stem VARCHAR NOT NULL,
            pod_id VARCHAR NOT NULL,
            quarterfinal_id VARCHAR NOT NULL,
            semifinal_side VARCHAR NOT NULL,
            bye_team VARCHAR NOT NULL,
            bye_seed INTEGER NOT NULL,
            pod_json JSON NOT NULL,
            PRIMARY KEY (run_stem, pod_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bracket_rounds (
            run_stem VARCHAR NOT NULL,
            round VARCHAR NOT NULL,
            game_num INTEGER NOT NULL,
            game_id VARCHAR,
            team_a VARCHAR,
            team_b VARCHAR,
            seed_a INTEGER,
            seed_b INTEGER,
            bye_team VARCHAR,
            feeds_from VARCHAR,
            winner_to_seed INTEGER,
            side VARCHAR,
            pods JSON,
            PRIMARY KEY (run_stem, round, game_num)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_steps (
            run_stem VARCHAR NOT NULL,
            step_index INTEGER NOT NULL,
            step VARCHAR NOT NULL,
            message VARCHAR NOT NULL,
            phase_messages JSON,
            PRIMARY KEY (run_stem, step_index)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS team_resumes (
            run_stem VARCHAR NOT NULL,
            team VARCHAR NOT NULL,
            rank INTEGER NOT NULL,
            seed INTEGER,
            bid_type VARCHAR,
            in_field BOOLEAN NOT NULL,
            detail_level VARCHAR NOT NULL,
            conference VARCHAR,
            abbreviation VARCHAR,
            is_conference_champion BOOLEAN NOT NULL,
            champion_of VARCHAR,
            record_wins INTEGER NOT NULL,
            record_losses INTEGER NOT NULL,
            composite_score DOUBLE NOT NULL,
            resume_score DOUBLE NOT NULL,
            predictive_score DOUBLE NOT NULL,
            sor_score DOUBLE NOT NULL,
            sos_score DOUBLE NOT NULL,
            component_rank_resume INTEGER NOT NULL,
            component_rank_predictive INTEGER NOT NULL,
            component_rank_sor INTEGER NOT NULL,
            component_rank_sos INTEGER NOT NULL,
            selection_case JSON,
            why_in JSON,
            concerns JSON,
            PRIMARY KEY (run_stem, team)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS team_schedule (
            run_stem VARCHAR NOT NULL,
            team VARCHAR NOT NULL,
            week INTEGER NOT NULL,
            opponent VARCHAR NOT NULL,
            opponent_rank INTEGER,
            location VARCHAR NOT NULL,
            result VARCHAR NOT NULL,
            points_for INTEGER NOT NULL,
            points_against INTEGER NOT NULL,
            PRIMARY KEY (run_stem, team, week, opponent)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sensitivity_teams (
            run_stem VARCHAR NOT NULL,
            team VARCHAR NOT NULL,
            abbreviation VARCHAR,
            selection_frequency DOUBLE NOT NULL,
            in_field_count INTEGER NOT NULL,
            n_scenarios INTEGER NOT NULL,
            base_rank INTEGER NOT NULL,
            base_seed INTEGER,
            base_selected BOOLEAN NOT NULL,
            base_status VARCHAR NOT NULL,
            status VARCHAR NOT NULL,
            median_rank INTEGER NOT NULL,
            most_common_outcome VARCHAR NOT NULL,
            primary_risk VARCHAR NOT NULL,
            PRIMARY KEY (run_stem, team)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS record_games (
            run_stem VARCHAR NOT NULL,
            game_id BIGINT NOT NULL,
            week INTEGER NOT NULL,
            home_team VARCHAR NOT NULL,
            away_team VARCHAR NOT NULL,
            home_score INTEGER NOT NULL,
            away_score INTEGER NOT NULL,
            neutral_site BOOLEAN NOT NULL,
            PRIMARY KEY (run_stem, game_id)
        )
        """
    )
