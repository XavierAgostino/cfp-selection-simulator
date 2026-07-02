"""
CFP Selection Simulator — Streamlit dashboard.

A transparent decision-support simulator for College Football Playoff selection.
"""

from __future__ import annotations

import subprocess
import sys
from io import StringIO
from typing import Any, Dict, Optional, Tuple

import pandas as pd
import streamlit as st

from app.components import (
    bubble_section_teams,
    build_components_scatter,
    build_rankings_display_df,
    build_selection_case,
    derive_bid_status,
    field_team_meta,
    filter_rankings_df,
    format_rules_label,
    format_rules_short,
    render_audit_timeline,
    render_badges_html,
    render_logo_html,
    render_methodology_summary,
    render_metric_card,
    render_pending_banner,
    render_run_context,
    render_sample_data_banner,
    render_team_row,
    run_timestamp,
)
from app.components.bracket_viewer import (
    build_bracket_pods,
    enrich_pods,
    export_bracket_csv,
    export_bracket_html,
    render_bracket_component,
)
from app.styles import inject_global_css
from src.assets.logos import ensure_team_assets_loaded
from src.assets.teams import load_team_assets
from src.config.formats import get_format_for_year
from src.config.simulator import SimulatorConfig
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.paths import DATA_OUTPUT, RunOutputPaths
from src.pipeline.run import SAMPLE_GAMES, load_games, run_select
from src.pipeline.sample import enrich_sample_rankings
from src.playoff.bracket import BracketMatchup
from src.playoff.bracket_plotly import create_interactive_bracket

st.set_page_config(page_title="CFP Selection Simulator", layout="wide")
inject_global_css()

st.title("CFP Selection Simulator")
st.caption(
    "A transparent decision-support simulator for College Football Playoff selection, "
    "designed to reproduce, audit, explain, and stress-test committee-style rankings."
)


def _params_key(season: int, week: int, use_sample: bool) -> Tuple[int, int, bool]:
    return (season, week, use_sample)


@st.cache_data(show_spinner="Running simulator…")
def run_simulation_cached(season: int, week: int, use_sample: bool) -> Dict[str, Any]:
    """Run pipeline and return serializable results only."""
    config = SimulatorConfig(year=season, week=week)
    fmt = get_format_for_year(season) if season >= 2024 else None

    if use_sample and SAMPLE_GAMES.exists():
        games = load_games(config, use_sample=True)
    else:
        games = load_games(config, use_sample=use_sample)

    rankings = calculate_composite_rankings(games)
    if use_sample:
        rankings = enrich_sample_rankings(rankings)

    if "conf_champ" not in rankings.columns:
        rankings = rankings.copy()
        rankings["conf_champ"] = "No"

    load_team_assets(use_sample=use_sample)
    if not use_sample:
        try:
            ensure_team_assets_loaded(use_sample=False, year=season)
        except Exception:
            load_team_assets(use_sample=True)

    selection_payload: Optional[Dict[str, Any]] = None
    if season >= 2024:
        output_paths = RunOutputPaths(year=season, week=week)
        select_result = run_select(config, rankings, output_paths)
        selection_payload = {
            "seeded_csv": select_result["seeded"].to_csv(index=False),
            "audit_log": select_result["selection"].audit_log,
            "audit_entries": [
                {"step": e.step.value, "message": e.message}
                for e in select_result["selection"].audit.entries
            ],
            "auto_bids": select_result["selection"].auto_bids,
            "at_large_bids": select_result["selection"].at_large_bids,
            "first_four_out": select_result["selection"].first_four_out,
            "playoff_teams": select_result["selection"].playoff_teams,
            "displaced_team": select_result["selection"].displaced_team,
            "champ_pulled_in": select_result["selection"].champ_pulled_in,
            "first_round": [
                {
                    "game_num": m.game_num,
                    "seed_high": m.seed_high,
                    "seed_low": m.seed_low,
                    "team_high": m.team_high,
                    "team_low": m.team_low,
                    "location": m.location,
                }
                for m in select_result["first_round"]
            ],
        }

    return {
        "rankings_csv": rankings.to_csv(index=False),
        "season": season,
        "week": week,
        "use_sample": use_sample,
        "format_name": fmt.name if fmt else "",
        "selection": selection_payload,
        "generated_at": run_timestamp(),
    }


def _rehydrate_selection(
    payload: Dict[str, Any]
) -> Tuple[Optional[Any], Optional[pd.DataFrame], list]:
    """Rebuild lightweight selection views from cached payload."""
    if not payload:
        return None, None, []

    from src.selection.audit import AuditEntry, AuditStep, SelectionAudit
    from src.selection.field import PlayoffSelection

    audit = SelectionAudit()
    for entry in payload.get("audit_entries", []):
        audit.add(AuditStep(entry["step"]), entry["message"])

    selection = PlayoffSelection(
        playoff_teams=payload["playoff_teams"],
        auto_bids=payload["auto_bids"],
        at_large_bids=payload["at_large_bids"],
        first_four_out=payload["first_four_out"],
        displaced_team=payload.get("displaced_team"),
        champ_pulled_in=payload.get("champ_pulled_in", False),
        audit_log=payload.get("audit_log", []),
        audit=audit,
    )
    seeded = pd.read_csv(StringIO(payload["seeded_csv"]))
    first_round_raw = payload.get("first_round", [])
    return selection, seeded, first_round_raw


def _first_round_objects(first_round_raw: list) -> list:
    return [
        BracketMatchup(
            round="First Round",
            game_num=m["game_num"],
            seed_high=m["seed_high"],
            seed_low=m["seed_low"],
            team_high=m["team_high"],
            team_low=m["team_low"],
            is_bye=False,
            host_team=m["team_high"],
            location=m.get("location", ""),
        )
        for m in first_round_raw
    ]


# --- Sidebar ---
with st.sidebar:
    st.header("Settings")
    pending_season = int(st.number_input("Season", min_value=2024, max_value=2030, value=2025))
    pending_week = int(st.slider("Week", min_value=5, max_value=15, value=15))

    st.subheader("Data source")
    sample_available = SAMPLE_GAMES.exists()
    data_options = ["Sample fixture", "Live CFBD data"]
    default_idx = 0 if sample_available else 1
    data_choice = st.radio(
        "Data source",
        data_options,
        index=default_idx,
        label_visibility="collapsed",
    )
    pending_sample = data_choice == "Sample fixture"

    fmt = get_format_for_year(pending_season) if pending_season >= 2024 else None
    st.subheader("Ruleset")
    st.caption(format_rules_label(pending_season) if fmt else "N/A")
    if fmt:
        st.caption(format_rules_short(pending_season))

    st.subheader("Actions")
    run_clicked = st.button("Run simulator", type="primary", use_container_width=True)

    if st.button("Open output folder", use_container_width=True):
        DATA_OUTPUT.mkdir(parents=True, exist_ok=True)
        if sys.platform == "darwin":
            subprocess.run(["open", str(DATA_OUTPUT)], check=False)
        else:
            st.info(f"Output folder: {DATA_OUTPUT}")

    pending = _params_key(pending_season, pending_week, pending_sample)
    if "last_run_params" not in st.session_state:
        st.session_state.last_run_params = None
    if "run_payload" not in st.session_state:
        st.session_state.run_payload = None

    should_run = run_clicked or st.session_state.last_run_params is None
    if should_run:
        try:
            st.session_state.run_payload = run_simulation_cached(
                pending_season, pending_week, pending_sample
            )
            st.session_state.last_run_params = pending
        except Exception as exc:
            st.error(f"Simulation failed: {exc}")
            if not pending_sample:
                st.info("Live CFBD data unavailable. Try Sample fixture data.")
            st.stop()

    st.subheader("Run info")
    if st.session_state.run_payload:
        payload = st.session_state.run_payload
        source_badge = render_badges_html(
            [("SAMPLE DATA", "sample") if payload["use_sample"] else ("LIVE DATA", "live")]
        )
        st.markdown(source_badge, unsafe_allow_html=True)
        st.caption(f"Ruleset: {format_rules_label(payload['season'])}")
        st.caption("Mode: Composite")
        st.caption(f"Generated: {payload.get('generated_at', '—')}")

# --- Active run data ---
params_dirty = pending != st.session_state.last_run_params
if params_dirty:
    render_pending_banner()

payload = st.session_state.run_payload
if payload is None:
    st.warning("Run the simulator to load results.")
    st.stop()

season = payload["season"]
week = payload["week"]
use_sample = payload["use_sample"]
rankings = pd.read_csv(StringIO(payload["rankings_csv"]))
selection, seeded, first_round_raw = _rehydrate_selection(payload.get("selection"))
first_round = _first_round_objects(first_round_raw) if first_round_raw else []
playoff_format = get_format_for_year(season) if season >= 2024 else None

render_run_context(season, week, playoff_format, use_sample) if playoff_format else None
if use_sample:
    render_sample_data_banner()

output_paths = RunOutputPaths(year=season, week=week)
bracket_metadata = {
    "season": season,
    "week": week,
    "ruleset_label": format_rules_label(season),
    "ruleset_short": format_rules_short(season),
}
bracket_pods = None
if seeded is not None and selection is not None:
    auto_bid_names = {t["team"] for t in selection.auto_bids}
    bracket_pods = enrich_pods(build_bracket_pods(seeded), use_sample, auto_bid_names)

with st.sidebar:
    st.subheader("Export")
    export_html = st.button("Export bracket HTML", use_container_width=True)
    export_csv = st.button("Export bracket CSV", use_container_width=True)
    if export_html or export_csv:
        if bracket_pods:
            if export_html:
                path = export_bracket_html(
                    bracket_pods, bracket_metadata, output_paths.bracket_html
                )
                st.success(f"Wrote {path.name}")
            if export_csv:
                csv_path = output_paths.bracket.parent / f"{output_paths.stem}_bracket_pods.csv"
                path = export_bracket_csv(bracket_pods, csv_path)
                st.success(f"Wrote {path.name}")
        else:
            st.warning("No bracket data to export.")

# --- Tabs ---
(
    tab_overview,
    tab_rankings,
    tab_field,
    tab_bracket,
    tab_bubble,
    tab_resume,
    tab_components,
    tab_audit,
    tab_method,
) = st.tabs(
    [
        "Overview",
        "Rankings",
        "Playoff Field",
        "Bracket",
        "Bubble Watch",
        "Team Resume",
        "Components",
        "Selection Audit",
        "Methodology",
    ]
)

# --- Overview ---
with tab_overview:
    st.subheader("Overview")
    if selection and seeded is not None:
        top_team = rankings.iloc[0]
        first_out = selection.first_four_out[0]["team"] if selection.first_four_out else "—"
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            render_metric_card("#1 Team", str(top_team["team"]))
        with c2:
            render_metric_card("Auto Bids", str(len(selection.auto_bids)))
        with c3:
            render_metric_card("At-Large Bids", str(len(selection.at_large_bids)))
        with c4:
            render_metric_card("First Team Out", first_out)

        col_left, col_right = st.columns(2)
        with col_left:
            st.markdown(
                '<div class="panel-card"><h4>Projected Playoff Field</h4>', unsafe_allow_html=True
            )
            for team in selection.playoff_teams:
                badges = derive_bid_status(team["team"], selection, seeded)
                render_team_row(
                    team["team"],
                    f"#{int(team['rank'])} {team['team']}",
                    meta=field_team_meta(team, selection, seeded),
                    badges=badges,
                    use_sample=use_sample,
                )
            st.markdown("</div>", unsafe_allow_html=True)

        with col_right:
            st.markdown(
                '<div class="panel-card"><h4>First-Round Matchups</h4>', unsafe_allow_html=True
            )
            if first_round:
                for m in first_round:
                    st.markdown(
                        f"**#{m.seed_high} {m.team_high}** vs **#{m.seed_low} {m.team_low}**  \n"
                        f"<span style='color:#9CA3AF;font-size:0.85rem'>{m.location}</span>",
                        unsafe_allow_html=True,
                    )
            else:
                st.caption("First-round matchups available when field is computed.")
            st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.info("Overview requires season 2024+ with a computed playoff field.")

# --- Rankings ---
with tab_rankings:
    st.subheader("Composite Rankings")
    display_df = build_rankings_display_df(rankings, selection, seeded)
    filter_choice = st.selectbox(
        "Show",
        ["All", "Playoff Teams", "Bubble", "Conference Champions"],
        label_visibility="collapsed",
    )
    filtered = filter_rankings_df(display_df, rankings, selection, filter_choice)

    table_html = [
        '<div class="panel-card"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;">'
    ]
    table_html.append(
        "<thead><tr style='color:#9CA3AF;text-align:left;border-bottom:1px solid #2D3748'>"
        "<th style='padding:0.4rem'>Rank</th><th>Team</th><th>Conf</th>"
        "<th>Composite</th><th>Resume</th><th>Predictive</th>"
        "<th>SOR</th><th>SOS</th><th>Bid Status</th></tr></thead><tbody>"
    )
    for _, row in filtered.iterrows():
        team = row["Team"]
        logo = render_logo_html(team, use_sample=use_sample)
        table_html.append(
            f"<tr style='border-bottom:1px solid rgba(45,55,72,0.5)'>"
            f"<td style='padding:0.45rem 0.4rem'>#{int(row['Rank'])}</td>"
            f"<td><div style='display:flex;align-items:center;gap:0.5rem'>{logo}{team}</div></td>"
            f"<td>{row['Conf']}</td><td>{row['Composite']}</td><td>{row['Resume']}</td>"
            f"<td>{row['Predictive']}</td><td>{row['SOR']}</td><td>{row['SOS']}</td>"
            f"<td>{row['Bid Status']}</td></tr>"
        )
    table_html.append("</tbody></table></div>")
    st.markdown("".join(table_html), unsafe_allow_html=True)

# --- Playoff Field ---
with tab_field:
    st.subheader("Playoff Field")
    if selection and seeded is not None:
        sections = [
            ("Automatic Bids", selection.auto_bids),
            ("At-Large Bids", selection.at_large_bids),
            ("First Four Out", selection.first_four_out),
        ]
        for title, teams in sections:
            st.markdown(f'<div class="panel-card"><h4>{title}</h4>', unsafe_allow_html=True)
            for team in teams:
                badges = derive_bid_status(team["team"], selection, seeded)
                meta = field_team_meta(team, selection, seeded)
                render_team_row(
                    team["team"],
                    f"#{int(team['rank'])} {team['team']}",
                    meta=meta,
                    badges=badges,
                    use_sample=use_sample,
                )
            st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.info("12-team selection requires season 2024+.")

# --- Bracket ---
with tab_bracket:
    st.subheader("Projected CFP Bracket")
    if bracket_pods and first_round:
        view_mode_label = st.radio(
            "View",
            ["Full Bracket", "Round View", "Matchup Cards"],
            horizontal=True,
            label_visibility="collapsed",
        )
        view_mode_map = {
            "Full Bracket": "full",
            "Round View": "round",
            "Matchup Cards": "matchups",
        }
        view_mode = view_mode_map[view_mode_label]

        exp_col1, exp_col2, exp_col3 = st.columns(3)
        with exp_col1:
            if st.button("Download PNG", disabled=True, help="Coming in a future release"):
                pass
        with exp_col2:
            if st.button("Export HTML", key="bracket_tab_export_html"):
                path = export_bracket_html(
                    bracket_pods, bracket_metadata, output_paths.bracket_html
                )
                st.success(f"Exported to {path}")
        with exp_col3:
            if st.button("Copy share summary", disabled=True):
                pass

        render_bracket_component(
            bracket_pods,
            bracket_metadata,
            view_mode=view_mode,
            height=780 if view_mode == "full" else 520,
        )

        st.markdown("**First-round campus games**")
        for m in first_round:
            st.markdown(f"- #{m.seed_high} {m.team_high} hosts #{m.seed_low} {m.team_low}")
        st.markdown("**Quarterfinal byes**")
        bye_teams = seeded[seeded["is_bye"] == True].sort_values("seed")  # noqa: E712
        for _, t in bye_teams.iterrows():
            st.markdown(f"- #{int(t['seed'])} {t['team']}")

        with st.expander("Advanced / Legacy chart"):
            fig = create_interactive_bracket(
                seeded,
                first_round,
                title=f"CFP Bracket {season} (Week {week})",
            )
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Bracket available when playoff field is computed.")

# --- Bubble Watch ---
with tab_bubble:
    st.subheader("Bubble Watch")
    if selection and seeded is not None:
        sections = [
            ("Last Four In", 8, 11),
            ("First Four Out", 12, 15),
            ("Next Four Out", 16, 19),
        ]
        for title, lo, hi in sections:
            teams = bubble_section_teams(seeded, rankings, lo, hi)
            st.markdown(f'<div class="panel-card"><h4>{title}</h4>', unsafe_allow_html=True)
            for team in teams:
                badges = derive_bid_status(team["team"], selection, seeded)
                note = ""
                if (
                    selection.displaced_team
                    and selection.displaced_team.get("team") == team["team"]
                ):
                    note = "Displaced by guaranteed conference champion"
                render_team_row(
                    team["team"],
                    f"#{int(team['rank'])} {team['team']}",
                    meta=note,
                    badges=badges,
                    use_sample=use_sample,
                )
            st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.info("Bubble watch requires a computed playoff field.")

# --- Team Resume ---
with tab_resume:
    st.subheader("Team Resume")
    team = st.selectbox("Select team", rankings["team"].head(25), label_visibility="collapsed")
    row = rankings[rankings["team"] == team].iloc[0]
    badges = derive_bid_status(team, selection, seeded)

    st.markdown(render_logo_html(team, size="lg", use_sample=use_sample), unsafe_allow_html=True)
    st.markdown(f'<div class="profile-headline">{team}</div>', unsafe_allow_html=True)

    badge_parts = [f"#{int(row['rank'])} Composite Rank"]
    if "conference" in row and pd.notna(row["conference"]):
        badge_parts.append(str(row["conference"]))
    st.markdown(
        f'<div class="profile-sub">{" · ".join(badge_parts)} {render_badges_html(badges)}</div>',
        unsafe_allow_html=True,
    )

    m1, m2, m3, m4, m5 = st.columns(5)
    with m1:
        render_metric_card("Composite", f"{row['composite_score']:.3f}")
    with m2:
        render_metric_card("Resume", f"{row['resume_score']:.3f}")
    with m3:
        render_metric_card("Predictive", f"{row['predictive_score']:.3f}")
    with m4:
        render_metric_card("SOR", f"{row['sor']:.3f}")
    with m5:
        render_metric_card("SOS", f"{row['sos']:.3f}")

    why, concerns = build_selection_case(team, row, selection, seeded)
    col_why, col_con = st.columns(2)
    with col_why:
        st.markdown('<div class="panel-card"><h4>Why they are in</h4>', unsafe_allow_html=True)
        if why:
            for item in why:
                st.markdown(f"- {item}")
        else:
            st.caption("Not in the projected playoff field.")
        st.markdown("</div>", unsafe_allow_html=True)
    with col_con:
        st.markdown('<div class="panel-card"><h4>Potential concerns</h4>', unsafe_allow_html=True)
        if concerns:
            for item in concerns:
                st.markdown(f"- {item}")
        else:
            st.caption("No notable concerns from component scores.")
        st.markdown("</div>", unsafe_allow_html=True)

# --- Components ---
with tab_components:
    st.subheader("Resume vs Predictive")
    fig = build_components_scatter(rankings, selection, seeded)
    st.plotly_chart(fig, use_container_width=True)

# --- Audit ---
with tab_audit:
    st.subheader("Selection Audit")
    if selection:
        render_audit_timeline(selection.audit)
    else:
        st.info("Audit trail available when playoff field is computed.")

# --- Methodology ---
with tab_method:
    st.subheader("Methodology")
    render_methodology_summary()
