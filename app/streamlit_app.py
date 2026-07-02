"""
Selection Room — Analyst Console (Streamlit dashboard).

A transparent decision-support simulator for College Football Playoff selection.
"""

from __future__ import annotations

import html
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
    render_bubble_section,
    render_case_panel,
    render_info_callout,
    render_logo_html,
    render_methodology_summary,
    render_metric_card,
    render_overview_field_table,
    render_pending_banner,
    render_rankings_table_html,
    render_run_context,
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
from src.pipeline.live import enrich_live_rankings
from src.pipeline.paths import DATA_OUTPUT, RunOutputPaths
from src.pipeline.run import SAMPLE_GAMES, load_games, run_select
from src.pipeline.sample import enrich_sample_rankings
from src.playoff.bracket import BracketMatchup

st.set_page_config(page_title="Selection Room — Analyst Console", layout="wide")
inject_global_css()

st.title("Selection Room — Analyst Console")
st.markdown(
    '<p class="app-subtitle">Transparent CFP ranking, selection, and bracket analysis.</p>',
    unsafe_allow_html=True,
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
    champion_source = "sample_fixture"
    if use_sample:
        rankings = enrich_sample_rankings(rankings)
    else:
        rankings, champion_source = enrich_live_rankings(rankings, games, year=season, api_key=None)

    load_team_assets(use_sample=use_sample)
    if not use_sample:
        ensure_team_assets_loaded(use_sample=False, year=season)

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
        "n_games": len(games),
        "n_teams": len(rankings),
        "champion_source": champion_source,
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

    run_clicked = st.button("Run simulator", type="primary", width="stretch")

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

    st.header("Current Run")
    if st.session_state.run_payload:
        payload = st.session_state.run_payload
        st.markdown(
            f'<div class="sidebar-run-summary">{payload["season"]} · Week {payload["week"]}</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div class="sidebar-run-meta">{format_rules_label(payload["season"])}</div>',
            unsafe_allow_html=True,
        )
        source_badge = render_badges_html(
            [("Sample Data", "sample") if payload["use_sample"] else ("Live Data", "live")]
        )
        st.markdown(source_badge, unsafe_allow_html=True)

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

if playoff_format:
    render_run_context(
        season,
        week,
        playoff_format,
        use_sample,
        n_teams=payload.get("n_teams"),
        n_games=payload.get("n_games"),
    )

if use_sample:
    render_info_callout(
        "Sample fixture: 20 curated teams with hand-labeled conference champions. "
        "Rankings are relative to this small pool, not full FBS."
    )
elif payload.get("n_teams", 0) > 200:
    st.warning(
        "Live data returned an unusually large team count. "
        "Clear cache with `sroom clean --cache`, then re-run the simulator."
    )
elif payload.get("champion_source") == "cfbd_records":
    render_info_callout(
        "Composite rankings over full FBS (~130 teams). Auto bids use CFBD conference-record "
        "leaders (not official CCG results). Scores are model outputs, not AP/CFP poll replicas."
    )
elif not use_sample:
    render_info_callout(
        "Composite rankings over full FBS (~130 teams). Auto bids inferred from composite rank "
        "per conference (CFBD records unavailable). Not AP/CFP poll replicas."
    )

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
    st.header("Exports")
    export_html = st.button("Bracket HTML", width="stretch")
    export_csv = st.button("Bracket CSV", width="stretch")
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
        "Field",
        "Bracket",
        "Bubble",
        "Resume",
        "Components",
        "Audit",
        "Methodology",
    ]
)

# --- Overview ---
with tab_overview:
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
            table_html = render_overview_field_table(
                selection.playoff_teams, selection, seeded, use_sample
            )
            st.markdown(
                f'<div class="app-card"><h4>Projected Playoff Field</h4>{table_html}</div>',
                unsafe_allow_html=True,
            )

        with col_right:
            matchup_lines = []
            if first_round:
                for m in first_round:
                    matchup_lines.append(
                        f'<div class="cfp-matchup-line">#{m.seed_high} {html.escape(m.team_high)} '
                        f"vs #{m.seed_low} {html.escape(m.team_low)}</div>"
                    )
            else:
                matchup_lines.append(
                    '<div class="cfp-matchup-line" style="color:#9CA3AF">'
                    "First-round matchups available when field is computed.</div>"
                )
            st.markdown(
                f'<div class="app-card"><h4>First-Round Matchups</h4>{"".join(matchup_lines)}</div>',
                unsafe_allow_html=True,
            )
    else:
        st.info("Overview requires season 2024+ with a computed playoff field.")

# --- Rankings ---
with tab_rankings:
    display_df = build_rankings_display_df(rankings, selection, seeded)
    ctrl1, ctrl2 = st.columns([1, 1])
    with ctrl1:
        filter_choice = st.selectbox(
            "Filter",
            ["All", "Playoff Teams", "Bubble", "Conference Champions"],
        )
    with ctrl2:
        search = st.text_input("Search team", placeholder="Search team…")
    filtered = filter_rankings_df(display_df, rankings, selection, filter_choice)
    if search.strip():
        filtered = filtered[filtered["Team"].str.contains(search.strip(), case=False, na=False)]
    bid_badges = {
        str(team): derive_bid_status(str(team), selection, seeded) for team in filtered["Team"]
    }
    table = render_rankings_table_html(filtered, bid_badges, use_sample)
    st.markdown(f'<div class="app-card">{table}</div>', unsafe_allow_html=True)

# --- Playoff Field ---
with tab_field:
    if selection and seeded is not None:
        sections = [
            ("Automatic Bids", selection.auto_bids),
            ("At-Large Bids", selection.at_large_bids),
            ("First Four Out", selection.first_four_out),
        ]
        for title, teams in sections:
            st.markdown(f'<div class="section-heading">{title}</div>', unsafe_allow_html=True)
            for team in teams:
                badges = derive_bid_status(team["team"], selection, seeded)
                render_team_row(
                    team["team"],
                    f"#{int(team['rank'])} {team['team']}",
                    meta=field_team_meta(team, selection, seeded),
                    badges=badges,
                    use_sample=use_sample,
                )
    else:
        st.info("12-team selection requires season 2024+.")

# --- Bracket ---
with tab_bracket:
    if bracket_pods and first_round:
        view_mode_label = st.radio(
            "View",
            ["Round View", "Full Bracket", "Matchup Cards"],
            horizontal=True,
            label_visibility="collapsed",
        )
        view_mode_map = {
            "Round View": "round",
            "Full Bracket": "full",
            "Matchup Cards": "matchups",
        }
        view_mode = view_mode_map[view_mode_label]

        if st.button("Export HTML", key="bracket_tab_export_html"):
            path = export_bracket_html(
                bracket_pods, bracket_metadata, output_paths.bracket_html, view_mode=view_mode
            )
            st.success(f"Exported to {path}")

        render_bracket_component(
            bracket_pods,
            bracket_metadata,
            view_mode=view_mode,
            height=780 if view_mode == "full" else 480,
        )
    else:
        st.info("Bracket available when playoff field is computed.")

# --- Bubble Watch ---
with tab_bubble:
    if selection and seeded is not None:
        st.markdown('<div class="app-card-flat">', unsafe_allow_html=True)
        for title, lo, hi in [
            ("Last Four In", 8, 11),
            ("First Four Out", 12, 15),
            ("Next Four Out", 16, 19),
        ]:
            teams = bubble_section_teams(seeded, rankings, lo, hi)
            render_bubble_section(title, teams, selection, seeded, use_sample)
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.info("Bubble watch requires a computed playoff field.")

# --- Team Resume ---
with tab_resume:
    ctrl_col, _ = st.columns([1, 2])
    with ctrl_col:
        team = st.selectbox("Select team", rankings["team"].head(25))
    row = rankings[rankings["team"] == team].iloc[0]
    badges = derive_bid_status(team, selection, seeded)

    head_col1, head_col2 = st.columns([1, 4])
    with head_col1:
        st.markdown(
            render_logo_html(team, size="lg", use_sample=use_sample), unsafe_allow_html=True
        )
    with head_col2:
        st.markdown(
            f'<div class="profile-headline">{html.escape(team)}</div>', unsafe_allow_html=True
        )
        badge_parts = [f"#{int(row['rank'])} Composite Rank"]
        if "conference" in row and pd.notna(row["conference"]):
            badge_parts.append(str(row["conference"]))
        st.markdown(
            f'<div class="profile-sub">{" · ".join(badge_parts)} {render_badges_html(badges)}</div>',
            unsafe_allow_html=True,
        )

    m1, m2, m3, m4, m5 = st.columns(5)
    with m1:
        render_metric_card("Composite", f"{row['composite_score']:.3f}", small=True)
    with m2:
        render_metric_card("Resume", f"{row['resume_score']:.3f}", small=True)
    with m3:
        render_metric_card("Predictive", f"{row['predictive_score']:.3f}", small=True)
    with m4:
        render_metric_card("SOR", f"{row['sor']:.3f}", small=True)
    with m5:
        render_metric_card("SOS", f"{row['sos']:.3f}", small=True)

    why, concerns = build_selection_case(team, row, selection, seeded)
    col_why, col_con = st.columns(2)
    with col_why:
        if why:
            render_case_panel("Why they are in", why, variant="positive")
        else:
            st.markdown(
                '<div class="case-panel"><h4>Why they are in</h4>'
                '<p style="color:#9CA3AF;margin:0;font-size:0.86rem">'
                "Not in the projected playoff field.</p></div>",
                unsafe_allow_html=True,
            )
    with col_con:
        if concerns:
            render_case_panel("Potential concerns", concerns, variant="warning")
        else:
            st.markdown(
                '<div class="case-panel"><h4>Potential concerns</h4>'
                '<p style="color:#9CA3AF;margin:0;font-size:0.86rem">'
                "No notable concerns from component scores.</p></div>",
                unsafe_allow_html=True,
            )

# --- Components ---
with tab_components:
    fig = build_components_scatter(rankings, selection, seeded)
    st.plotly_chart(fig, width="stretch")

# --- Audit ---
with tab_audit:
    if selection:
        render_audit_timeline(selection.audit)
    else:
        st.info("Audit trail available when playoff field is computed.")

# --- Methodology ---
with tab_method:
    render_methodology_summary()
