"""
CFP Selection Simulator — Streamlit dashboard.

A transparent decision-support simulator for College Football Playoff selection.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from src.assets.logos import ensure_team_assets_loaded, get_team_logo
from src.assets.teams import load_team_assets
from src.config.simulator import SimulatorConfig
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.run import SAMPLE_GAMES, load_games, run_select
from src.playoff.bracket_plotly import create_interactive_bracket

st.set_page_config(page_title="CFP Selection Simulator", layout="wide")

st.title("CFP Selection Simulator")
st.caption(
    "A transparent decision-support simulator for College Football Playoff selection, "
    "designed to reproduce, audit, explain, and stress-test committee-style rankings."
)

with st.sidebar:
    st.header("Settings")
    year = st.number_input("Season", min_value=2024, max_value=2030, value=2025)
    week = st.slider("Week", min_value=5, max_value=15, value=15)
    use_sample = st.checkbox("Use sample fixture data", value=SAMPLE_GAMES.exists())

config = SimulatorConfig(year=int(year), week=int(week))

tab_rankings, tab_field, tab_bracket, tab_resume, tab_components, tab_audit, tab_method = (
    st.tabs(
        [
            "Rankings",
            "Playoff Field",
            "Bracket",
            "Team Résumés",
            "Component Views",
            "Selection Audit",
            "Methodology",
        ]
    )
)

try:
    if use_sample and SAMPLE_GAMES.exists():
        games = load_games(config, use_sample=True)
    else:
        games = load_games(config, use_sample=use_sample)
    rankings = calculate_composite_rankings(games)
except Exception as exc:
    st.error(f"Could not load data: {exc}")
    st.info("Enable 'Use sample fixture data' or set CFBD_API_KEY in .env")
    st.stop()

load_team_assets(use_sample=use_sample)
if not use_sample:
    try:
        ensure_team_assets_loaded(use_sample=False, year=int(year))
    except Exception:
        load_team_assets(use_sample=True)

if "conf_champ" not in rankings.columns:
    rankings["conf_champ"] = "No"


def render_team_row(team_name: str, label: str, logo_size: int = 32) -> None:
    """Render a team row with logo from asset registry."""
    logo = get_team_logo(team_name, use_sample=use_sample)
    cols = st.columns([1, 8])
    with cols[0]:
        if logo:
            st.image(logo, width=logo_size)
    with cols[1]:
        st.markdown(label)


with tab_rankings:
    st.subheader("Composite Rankings")
    for _, row in rankings.head(25).iterrows():
        render_team_row(
            row["team"],
            f"**#{int(row['rank'])}** {row['team']} — "
            f"composite {row['composite_score']:.3f} | "
            f"résumé {row['resume_score']:.3f} | predictive {row['predictive_score']:.3f}",
            logo_size=28,
        )

selection_result = None
seeded = None
if year >= 2024:
    try:
        selection_result = run_select(config, rankings)
        seeded = selection_result["seeded"]
    except Exception as exc:
        st.warning(f"Selection unavailable: {exc}")

with tab_field:
    st.subheader("Playoff Field")
    if selection_result:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Automatic Bids**")
            for t in selection_result["selection"].auto_bids:
                render_team_row(t["team"], f"#{t['rank']} {t['team']}")
        with col2:
            st.markdown("**At-Large Bids**")
            for t in selection_result["selection"].at_large_bids:
                render_team_row(t["team"], f"#{t['rank']} {t['team']}")
        st.markdown("**First Four Out**")
        for t in selection_result["selection"].first_four_out:
            render_team_row(t["team"], f"#{t['rank']} {t['team']}")
    else:
        st.write("12-team selection requires season 2024+.")

with tab_bracket:
    st.subheader("Bracket")
    if seeded is not None and selection_result is not None:
        fig = create_interactive_bracket(
            seeded,
            selection_result["first_round"],
            title=f"CFP Bracket {year} (Week {week})",
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Bracket available when playoff field is computed.")

with tab_resume:
    st.subheader("Team Résumé")
    team = st.selectbox("Select team", rankings["team"].head(25))
    row = rankings[rankings["team"] == team].iloc[0]
    logo = get_team_logo(team, use_sample=use_sample)
    if logo:
        st.image(logo, width=72)
    st.metric("Rank", f"#{int(row['rank'])}")
    c1, c2, c3 = st.columns(3)
    c1.metric("Composite", f"{row['composite_score']:.3f}")
    c2.metric("Résumé", f"{row['resume_score']:.3f}")
    c3.metric("Predictive", f"{row['predictive_score']:.3f}")
    c4, c5 = st.columns(2)
    c4.metric("SOR", f"{row['sor']:.3f}")
    c5.metric("SOS", f"{row['sos']:.3f}")

with tab_components:
    st.subheader("Résumé vs Predictive")
    fig = px.scatter(
        rankings.head(30),
        x="resume_score",
        y="predictive_score",
        size="sos",
        hover_name="team",
        title="Résumé vs Predictive (bubble size = SOS)",
    )
    st.plotly_chart(fig, use_container_width=True)

with tab_audit:
    st.subheader("Selection Audit")
    if selection_result:
        for line in selection_result["selection"].audit_log:
            st.text(line)
    else:
        st.info("Audit trail available when playoff field is computed.")

with tab_method:
    st.subheader("Methodology")
    docs = Path(__file__).resolve().parents[1] / "docs" / "research"
    for name in ["cfp-format-history.md", "model-methodology.md", "limitations-and-ethics.md"]:
        path = docs / name
        if path.exists():
            st.markdown(path.read_text())
        else:
            st.caption(f"See docs/research/{name}")
