"""Shared Streamlit dashboard UI components."""

from __future__ import annotations

import html
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from app.styles import BADGE_STYLES, COLORS
from src.assets.logos import get_team_logo
from src.assets.teams import get_team_asset
from src.config.formats import PlayoffFormat, get_format_for_year
from src.selection.audit import AuditStep, SelectionAudit
from src.selection.field import PlayoffSelection

BadgeKind = str


def format_rules_label(year: int) -> str:
    """Human-readable ruleset label for a season."""
    if year < 2024:
        return "4-Team Era (not supported in dashboard)"
    fmt = get_format_for_year(year)
    if fmt.name == "2024":
        return "2024 Champion Byes"
    return "2025+ Straight Seeding"


def format_rules_short(year: int) -> str:
    """Short ruleset banner text."""
    if year < 2024:
        return "Pre-12-team format"
    fmt = get_format_for_year(year)
    if fmt.seeding == "champion_byes":
        return "Top four conference champions receive byes."
    return "Top four overall teams receive byes."


def render_badge(label: str, kind: BadgeKind = "default") -> str:
    """Return HTML for a status badge."""
    style = BADGE_STYLES.get(kind, BADGE_STYLES["default"])
    safe = html.escape(label)
    return (
        f'<span class="badge" style="background:{style["bg"]};color:{style["color"]};'
        f'border:none;">{safe}</span>'
    )


def render_badges_html(badges: Sequence[Tuple[str, BadgeKind]]) -> str:
    return " ".join(render_badge(label, kind) for label, kind in badges)


def _team_abbreviation(team_name: str, use_sample: bool) -> str:
    asset = get_team_asset(team_name, use_sample=use_sample)
    if asset and asset.abbreviation:
        return asset.abbreviation[:4].upper()
    parts = team_name.split()
    if len(parts) >= 2:
        return "".join(p[0] for p in parts[:3]).upper()[:4]
    return team_name[:3].upper()


def render_logo_html(team_name: str, size: str = "sm", use_sample: bool = False) -> str:
    """Return HTML for a logo inside a light neutral tile with abbreviation fallback."""
    logo = get_team_logo(team_name, use_sample=use_sample)
    abbrev = _team_abbreviation(team_name, use_sample)
    tile_class = "logo-tile-lg" if size == "lg" else "logo-tile"
    if logo and not logo.startswith("data:image/svg"):
        img = (
            f'<img src="{html.escape(logo)}" alt="{html.escape(team_name)} logo" '
            f"onerror=\"this.style.display='none';this.nextElementSibling.style.display='block'\"/>"
            f'<span class="logo-fallback" style="display:none">{html.escape(abbrev)}</span>'
        )
    else:
        img = f'<span class="logo-fallback">{html.escape(abbrev)}</span>'
    return f'<div class="{tile_class}">{img}</div>'


def render_logo(team_name: str, size: str = "sm", use_sample: bool = False) -> None:
    """Render logo tile in Streamlit."""
    st.markdown(
        render_logo_html(team_name, size=size, use_sample=use_sample), unsafe_allow_html=True
    )


def render_metric_card(
    label: str, value: str, help_text: Optional[str] = None, *, small: bool = False
) -> None:
    """Render a styled metric card."""
    help_attr = f' title="{html.escape(help_text)}"' if help_text else ""
    cls = "metric-card-sm" if small else "metric-card"
    st.markdown(
        f'<div class="{cls}"{help_attr}>'
        f'<div class="label">{html.escape(label)}</div>'
        f'<div class="value">{html.escape(value)}</div></div>',
        unsafe_allow_html=True,
    )


def render_run_context(
    season: int,
    week: int,
    fmt: PlayoffFormat,
    sample: bool,
    mode: str = "Composite",
    n_teams: Optional[int] = None,
    n_games: Optional[int] = None,
) -> None:
    """Render compact context badges under the header."""
    rules = format_rules_label(season)
    source_label = "Sample Data" if sample else "Live Data"
    source_kind: BadgeKind = "sample" if sample else "live"
    badges: List[Tuple[str, BadgeKind]] = [
        (f"{season} Season", "context"),
        (f"Week {week}", "context"),
        (rules, "rules"),
        (source_label, source_kind),
    ]
    if n_teams is not None and n_games is not None:
        badges.append((f"{n_teams} teams · {n_games} games", "context"))
    st.markdown(
        f'<div class="context-bar">{render_badges_html(badges)}</div>',
        unsafe_allow_html=True,
    )


def render_info_callout(message: str) -> None:
    st.markdown(
        f'<div class="info-callout">{html.escape(message)}</div>',
        unsafe_allow_html=True,
    )


def render_sample_data_banner() -> None:
    st.markdown(
        '<div class="sample-banner">'
        "<strong>Sample Fixture Data</strong><br>"
        "Demo results are illustrative and not official CFP projections."
        "</div>",
        unsafe_allow_html=True,
    )


def render_pending_banner() -> None:
    st.markdown(
        '<div class="pending-banner">'
        'Settings changed. Click <strong>"Run simulator"</strong> to refresh results.'
        "</div>",
        unsafe_allow_html=True,
    )


def derive_bid_status(
    team_name: str,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame] = None,
) -> List[Tuple[str, BadgeKind]]:
    """Derive bid status badges for a team from existing selection output."""
    if selection is None:
        return []

    badges: List[Tuple[str, BadgeKind]] = []
    auto_names = {t["team"] for t in selection.auto_bids}
    at_large_names = {t["team"] for t in selection.at_large_bids}
    playoff_names = auto_names | at_large_names
    first_out_names = {t["team"] for t in selection.first_four_out}

    if team_name in auto_names:
        badges.append(("AUTO", "auto"))
    elif team_name in at_large_names:
        badges.append(("AT-LARGE", "atlarge"))

    if seeded is not None and not seeded.empty:
        seed_row = seeded[seeded["team"] == team_name]
        if not seed_row.empty and bool(seed_row.iloc[0].get("is_bye")):
            badges.append(("BYE", "bye"))

    if selection.displaced_team and selection.displaced_team.get("team") == team_name:
        badges.append(("DISPLACED", "displaced"))
    elif team_name in first_out_names:
        badges.append(("FIRST OUT", "first_out"))

    if team_name in playoff_names and not badges:
        badges.append(("IN", "default"))

    return badges


def bid_status_label(badges: Sequence[Tuple[str, BadgeKind]]) -> str:
    if not badges:
        return "Unselected"
    return " · ".join(label for label, _ in badges)


def _team_conference(team_dict: Dict[str, Any]) -> str:
    conf = team_dict.get("conference") or "Unknown"
    conf_champ = str(team_dict.get("conf_champ", ""))
    if "Yes" in conf_champ:
        if "(" in conf_champ:
            return conf_champ.split("(")[1].rstrip(")")
        return conf
    return conf


def render_team_row_html(
    team_name: str,
    title: str,
    meta: str = "",
    badges: Optional[Sequence[Tuple[str, BadgeKind]]] = None,
    use_sample: bool = False,
) -> str:
    badge_html = render_badges_html(badges or []) if badges else ""
    meta_html = (
        f'<span class="team-row-meta">{badge_html or html.escape(meta)}</span>'
        if (badge_html or meta)
        else ""
    )
    return (
        f'<div class="team-row">{render_logo_html(team_name, use_sample=use_sample)}'
        f'<div class="team-row-main"><div class="team-row-title">{html.escape(title)}</div>'
        f"{meta_html}</div></div>"
    )


def render_team_row(
    team_name: str,
    title: str,
    meta: str = "",
    badges: Optional[Sequence[Tuple[str, BadgeKind]]] = None,
    use_sample: bool = False,
) -> None:
    st.markdown(
        render_team_row_html(team_name, title, meta=meta, badges=badges, use_sample=use_sample),
        unsafe_allow_html=True,
    )


def build_rankings_display_df(
    rankings: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
) -> pd.DataFrame:
    """Build rankings table with bid status column for display."""
    df = rankings.head(25).copy()
    df["Conf"] = df.apply(_team_conference, axis=1)
    df["Bid Status"] = df["team"].apply(
        lambda t: bid_status_label(derive_bid_status(t, selection, seeded))
    )
    display = df[
        [
            "rank",
            "team",
            "Conf",
            "composite_score",
            "resume_score",
            "predictive_score",
            "sor",
            "sos",
            "Bid Status",
        ]
    ].rename(
        columns={
            "rank": "Rank",
            "team": "Team",
            "composite_score": "Composite",
            "resume_score": "Resume",
            "predictive_score": "Predictive",
            "sor": "SOR",
            "sos": "SOS",
        }
    )
    for col in ("Composite", "Resume", "Predictive", "SOR", "SOS"):
        display[col] = display[col].map(lambda x: f"{float(x):.3f}")
    return display


def filter_rankings_df(
    df: pd.DataFrame,
    rankings: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    filter_name: str,
) -> pd.DataFrame:
    if selection is None or filter_name == "All":
        return df
    playoff_names = {t["team"] for t in selection.playoff_teams}
    champ_mask = rankings["conf_champ"].astype(str).str.contains("Yes", na=False)
    if filter_name == "Playoff Teams":
        return df[df["Team"].isin(playoff_names)]
    if filter_name == "Bubble":
        bubble_ranks = set(range(9, 16))
        bubble_teams = set(rankings[rankings["rank"].isin(bubble_ranks)]["team"])
        return df[df["Team"].isin(bubble_teams)]
    if filter_name == "Conference Champions":
        champs = set(rankings[champ_mask]["team"])
        return df[df["Team"].isin(champs)]
    return df


def render_overview_field_table(
    teams: List[Dict[str, Any]],
    selection: PlayoffSelection,
    seeded: Optional[pd.DataFrame],
    use_sample: bool,
) -> str:
    """Compact scan-friendly overview table for the playoff field."""
    rows = ['<table class="field-table"><thead><tr>']
    rows.append(
        "<th class='num'>Seed</th><th>Team</th><th>Bid</th><th>Status</th></tr></thead><tbody>"
    )
    for team in teams:
        badges = derive_bid_status(team["team"], selection, seeded)
        seed_val = int(team.get("seed", team.get("rank", 0)))
        if seeded is not None:
            seed_rows = seeded[seeded["team"] == team["team"]]
            if not seed_rows.empty:
                seed_val = int(seed_rows.iloc[0]["seed"])
        bid_labels = [b for b, _ in badges if b in ("AUTO", "AT-LARGE")]
        status_labels = [b for b, _ in badges if b in ("BYE", "DISPLACED", "FIRST OUT")]
        bid_html = (
            render_badges_html([(bid_labels[0], "auto" if bid_labels[0] == "AUTO" else "atlarge")])
            if bid_labels
            else "—"
        )
        status_html = (
            render_badges_html(
                [(status_labels[0], "bye" if status_labels[0] == "BYE" else "default")]
            )
            if status_labels
            else "—"
        )
        logo = render_logo_html(team["team"], use_sample=use_sample)
        rows.append(
            f"<tr><td class='num'>{seed_val}</td>"
            f"<td><div class='team-cell'>{logo}{html.escape(team['team'])}</div></td>"
            f"<td>{bid_html}</td><td>{status_html}</td></tr>"
        )
    rows.append("</tbody></table>")
    return "".join(rows)


def render_rankings_table_html(
    df: pd.DataFrame,
    bid_badges: Dict[str, List[Tuple[str, BadgeKind]]],
    use_sample: bool,
) -> str:
    """Rankings table with light styling and badge column."""
    parts = [
        '<table class="rankings-table"><thead><tr>',
        "<th class='num'>Rank</th><th>Team</th><th>Conf</th>",
        "<th class='num'>Composite</th><th class='num'>Resume</th><th class='num'>Predictive</th>",
        "<th class='num'>SOR</th><th class='num'>SOS</th><th>Bid</th>",
        "</tr></thead><tbody>",
    ]
    for _, row in df.iterrows():
        team = str(row["Team"])
        logo = render_logo_html(team, use_sample=use_sample)
        badges = bid_badges.get(team, [])
        bid_html = render_badges_html(badges) if badges else render_badge("Unselected", "default")
        parts.append(
            f"<tr>"
            f"<td class='num'>{int(row['Rank'])}</td>"
            f"<td><div class='team-cell'>{logo}{html.escape(team)}</div></td>"
            f"<td>{html.escape(str(row['Conf']))}</td>"
            f"<td class='num'>{row['Composite']}</td>"
            f"<td class='num'>{row['Resume']}</td>"
            f"<td class='num'>{row['Predictive']}</td>"
            f"<td class='num'>{row['SOR']}</td>"
            f"<td class='num'>{row['SOS']}</td>"
            f"<td>{bid_html}</td></tr>"
        )
    parts.append("</tbody></table>")
    return "".join(parts)


def render_bubble_section(
    title: str,
    teams: List[Dict[str, Any]],
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
    use_sample: bool,
) -> None:
    """Compact bubble section with heading divider and team rows."""
    st.markdown(f'<div class="section-heading">{html.escape(title)}</div>', unsafe_allow_html=True)
    for team in teams:
        badges = derive_bid_status(team["team"], selection, seeded)
        render_team_row(
            team["team"],
            f"#{int(team['rank'])} {team['team']}",
            badges=badges,
            use_sample=use_sample,
        )


def render_case_panel(title: str, items: List[str], *, variant: str = "positive") -> None:
    """Resume case bullets inside a single panel."""
    if not items:
        return
    li_class = "positive" if variant == "positive" else "warning"
    lis = "".join(f'<li class="{li_class}">{html.escape(item)}</li>' for item in items)
    st.markdown(
        f'<div class="case-panel"><h4>{html.escape(title)}</h4>'
        f'<ul class="case-list">{lis}</ul></div>',
        unsafe_allow_html=True,
    )


def field_team_meta(
    team: Dict[str, Any], selection: PlayoffSelection, seeded: Optional[pd.DataFrame]
) -> str:
    conf = _team_conference(team)
    parts: List[str] = []
    if "Yes" in str(team.get("conf_champ", "")):
        parts.append(f"{conf} Champion")
    seed_row = None
    if seeded is not None:
        rows = seeded[seeded["team"] == team["team"]]
        if not rows.empty:
            seed_row = rows.iloc[0]
    if seed_row is not None:
        parts.append(f"Seed {int(seed_row['seed'])}")
        if bool(seed_row.get("is_bye")):
            parts.append("Bye")
    if selection.displaced_team and selection.displaced_team.get("team") == team["team"]:
        return "Displaced by guaranteed conference champion"
    return " · ".join(parts) if parts else conf


def bubble_section_teams(
    seeded: Optional[pd.DataFrame],
    rankings: pd.DataFrame,
    start_rank: int,
    end_rank: int,
) -> List[Dict[str, Any]]:
    """Teams in a rank range, preferring seeded order when available."""
    if seeded is not None and not seeded.empty:
        rows = seeded[(seeded["rank"] >= start_rank) & (seeded["rank"] <= end_rank)]
        if not rows.empty:
            return rows.sort_values("rank").to_dict("records")
    return rankings[(rankings["rank"] >= start_rank) & (rankings["rank"] <= end_rank)].to_dict(
        "records"
    )


def build_selection_case(
    team_name: str,
    row: pd.Series,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
) -> Tuple[List[str], List[str]]:
    """Template-based selection case bullets from existing data."""
    why: List[str] = []
    concerns: List[str] = []

    if selection is None:
        return why, concerns

    if any(t["team"] == team_name for t in selection.auto_bids):
        why.append("Conference champion with an automatic bid")
    if any(t["team"] == team_name for t in selection.at_large_bids):
        why.append("Selected as an at-large bid based on composite ranking")

    if int(row["rank"]) == 1:
        why.append("Highest composite score in the field")

    if seeded is not None:
        seed_rows = seeded[seeded["team"] == team_name]
        if not seed_rows.empty:
            seed_val = int(seed_rows.iloc[0]["seed"])
            why.append(f"Playoff seed #{seed_val}")
            if bool(seed_rows.iloc[0].get("is_bye")):
                why.append("Top-four overall seed, receives first-round bye")

    if selection.displaced_team and selection.displaced_team.get("team") == team_name:
        concerns.append("Displaced from the field by a guaranteed conference champion")

    resume = float(row.get("resume_score", 0))
    predictive = float(row.get("predictive_score", 0))
    if predictive + 0.08 < resume:
        concerns.append("Predictive score trails resume score")
    elif resume + 0.08 < predictive:
        concerns.append("Resume score trails predictive strength")

    if not why and int(row["rank"]) <= 25:
        why.append("Ranked in the composite top 25")

    return why, concerns


AUDIT_STEP_TITLES: Dict[AuditStep, str] = {
    AuditStep.FOUND_CHAMPIONS: "Step 1 — Identify conference champions",
    AuditStep.AUTO_BIDS: "Step 2 — Award automatic bids",
    AuditStep.AT_LARGE: "Step 3 — Fill at-large bids",
    AuditStep.DISPLACEMENT: "Step 4 — Apply displacement rule",
    AuditStep.FINAL_FIELD: "Step 5 — Final playoff field",
    AuditStep.FIRST_FOUR_OUT: "Step 6 — First four out",
}


def render_audit_timeline(audit: SelectionAudit) -> None:
    """Render structured audit as a step timeline."""
    grouped: Dict[AuditStep, List[str]] = {}
    for entry in audit.entries:
        grouped.setdefault(entry.step, []).append(entry.message)

    order = [
        AuditStep.FOUND_CHAMPIONS,
        AuditStep.AUTO_BIDS,
        AuditStep.AT_LARGE,
        AuditStep.DISPLACEMENT,
        AuditStep.FINAL_FIELD,
        AuditStep.FIRST_FOUR_OUT,
    ]
    for step in order:
        messages = grouped.get(step)
        if not messages:
            continue
        title = AUDIT_STEP_TITLES.get(step, step.value)
        items = "".join(f"<li>{html.escape(m)}</li>" for m in messages)
        st.markdown(
            f'<div class="audit-step"><h5>{html.escape(title)}</h5><ul>{items}</ul></div>',
            unsafe_allow_html=True,
        )


def render_methodology_summary() -> None:
    """Short in-app methodology summary with doc links."""
    cards = [
        (
            "Format Rules",
            "2014–2023: four-team CFP. 2024: 12-team field with champion byes. "
            "2025+: straight seeding; top four overall receive byes.",
        ),
        (
            "Ranking Components",
            "Composite blends Resume (Colley + win%), Predictive (Massey + Elo), "
            "SOR, and SOS with configurable weights.",
        ),
        (
            "Data Sources",
            "Sample fixture data for offline demo, or live CFBD API when configured.",
        ),
        (
            "Committee alignment",
            "Transparent composite model, not committee vote replication. "
            "See docs/research/cfp-committee-alignment.md.",
        ),
    ]
    for title, body in cards:
        st.markdown(
            f'<div class="app-card-flat"><h4>{html.escape(title)}</h4>'
            f'<p style="color:{COLORS["muted"]};margin:0;font-size:0.88rem;">{html.escape(body)}</p></div>',
            unsafe_allow_html=True,
        )
    st.markdown(
        "- [Full methodology (docs/METHODOLOGY.md)](docs/METHODOLOGY.md)\n"
        "- [Research index (docs/research/)](docs/research/index.md)\n"
        "- [Format history](docs/research/cfp-format-history.md)\n"
        "- [Metric definitions](docs/research/metric-definitions.md)"
    )


def build_components_scatter(
    rankings: pd.DataFrame,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
) -> go.Figure:
    """Resume vs Predictive scatter with bid coloring and quadrant labels."""
    df = rankings.head(30).copy()
    df["bid_group"] = df["team"].apply(
        lambda t: bid_status_label(derive_bid_status(t, selection, seeded)) or "Unselected"
    )

    fig = px.scatter(
        df,
        x="resume_score",
        y="predictive_score",
        size="sos",
        color="bid_group",
        hover_name="team",
        hover_data={
            "rank": True,
            "conference": True,
            "composite_score": ":.3f",
            "resume_score": False,
            "predictive_score": False,
            "sos": False,
            "bid_group": False,
        },
        labels={
            "resume_score": "Resume Score",
            "predictive_score": "Predictive Score",
            "bid_group": "Bid Status",
        },
        title="Resume vs Predictive",
    )

    x_mid = df["resume_score"].median()
    y_mid = df["predictive_score"].median()
    quadrants = [
        (x_mid, y_mid, "Strong Resume / Strong Predictive"),
        (x_mid, y_mid * 0.5, "Strong Resume / Lower Predictive"),
        (x_mid * 0.5, y_mid, "Lower Resume / Strong Predictive"),
        (x_mid * 0.5, y_mid * 0.5, "Bubble / Long Shot"),
    ]
    for x, y, label in quadrants:
        fig.add_annotation(
            x=x,
            y=y,
            text=label,
            showarrow=False,
            font=dict(size=11, color="#94A3B8"),
            opacity=0.85,
        )

    fig.update_layout(
        plot_bgcolor=COLORS["panel"],
        paper_bgcolor=COLORS["bg"],
        font_color=COLORS["text"],
        legend=dict(bgcolor="rgba(17,24,39,0.85)", bordercolor=COLORS["border_soft"]),
        margin=dict(t=80),
    )
    fig.add_annotation(
        text=(
            "Teams above the diagonal have stronger predictive profiles than resumes; "
            "teams to the right have stronger resumes. Bubble size = SOS."
        ),
        xref="paper",
        yref="paper",
        x=0,
        y=1.08,
        showarrow=False,
        font=dict(size=11, color=COLORS["muted"]),
        align="left",
    )
    fig.update_xaxes(gridcolor=COLORS["border_soft"])
    fig.update_yaxes(gridcolor=COLORS["border_soft"])
    return fig


def run_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
