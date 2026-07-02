"""HTML/CSS bracket viewer for Streamlit dashboard."""

from __future__ import annotations

import csv
import html
from io import StringIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import streamlit.components.v1 as components

from src.assets.colors import get_primary_color
from src.assets.logos import get_team_logo
from src.assets.teams import get_team_asset
from src.playoff.bracket_view import PodDict, build_bracket_pods, build_bracket_rounds

APP_DIR = Path(__file__).resolve().parents[1]
CSS_PATH = APP_DIR / "static" / "bracket.css"

ViewMode = str  # "full" | "round" | "matchups"


def _load_css() -> str:
    return CSS_PATH.read_text(encoding="utf-8")


def _abbreviation(team_name: str, use_sample: bool) -> str:
    asset = get_team_asset(team_name, use_sample=use_sample)
    if asset and asset.abbreviation:
        return asset.abbreviation[:4].upper()
    parts = team_name.split()
    if len(parts) >= 2:
        return "".join(p[0] for p in parts[:3]).upper()[:4]
    return team_name[:3].upper()


def enrich_team(
    team: Dict[str, Any],
    use_sample: bool,
    auto_bid_names: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    """Add display fields for HTML rendering."""
    name = team["team"]
    asset = get_team_asset(name, use_sample=use_sample)
    conf_champ = str(team.get("conf_champ", ""))
    is_auto = bool(auto_bid_names and name in auto_bid_names) or "Yes" in conf_champ
    bid_type = "auto" if is_auto else "at_large"
    return {
        **team,
        "logo": get_team_logo(name, use_sample=use_sample),
        "abbreviation": asset.abbreviation
        if asset and asset.abbreviation
        else _abbreviation(name, use_sample),
        "primary_color": get_primary_color(name, use_sample=use_sample),
        "bid_type": bid_type,
        "conference": team.get("conference") or (asset.conference if asset else ""),
    }


def enrich_pods(
    pods: List[PodDict],
    use_sample: bool,
    auto_bid_names: Optional[Set[str]] = None,
) -> List[PodDict]:
    enriched: List[PodDict] = []
    for pod in pods:
        enriched.append(
            {
                **pod,
                "first_round": [
                    enrich_team(t, use_sample, auto_bid_names) for t in pod["first_round"]
                ],
                "bye": enrich_team(pod["bye"], use_sample, auto_bid_names),
            }
        )
    return enriched


def render_team_card_html(team: Dict[str, Any], *, bye_slot: bool = False) -> str:
    """Render a single team card."""
    seed = int(team["seed"])
    name = html.escape(str(team["team"]))
    color = html.escape(str(team.get("primary_color", "#64748B")))
    logo = team.get("logo") or ""
    abbrev = html.escape(str(team.get("abbreviation", "???")))
    bid = team.get("bid_type", "at_large")
    badge_cls = "auto" if bid == "auto" else "atlarge"
    badge_label = "AUTO" if bid == "auto" else "AT-LARGE"
    badges = [f'<span class="cfp-badge {badge_cls}">{badge_label}</span>']
    if team.get("is_bye"):
        badges.append('<span class="cfp-badge bye">BYE</span>')
    conf = html.escape(str(team.get("conference", "")))
    tooltip = html.escape(
        f"{team['team']} · Seed #{seed} · {badge_label}" + (f" · {conf}" if conf else "")
    )
    if logo and not str(logo).startswith("data:image/svg"):
        logo_html = (
            f'<img src="{html.escape(str(logo))}" alt="{name}" '
            f"onerror=\"this.style.display='none';this.nextElementSibling.style.display='block'\"/>"
            f'<span class="cfp-logo-fallback" style="display:none">{abbrev}</span>'
        )
    else:
        logo_html = f'<span class="cfp-logo-fallback">{abbrev}</span>'

    bye_class = " bye-slot" if bye_slot else ""
    return (
        f'<div class="cfp-team-card{bye_class}" style="--team-color:{color}" title="{tooltip}">'
        f'<div class="cfp-seed">{seed}</div>'
        f'<div class="cfp-logo-tile">{logo_html}</div>'
        f'<div class="cfp-team-info">'
        f'<div class="cfp-team-name">{name}</div>'
        f'<div class="cfp-team-meta">{"".join(badges)}'
        f'{f"<span>{conf}</span>" if conf else ""}'
        f"</div></div></div>"
    )


def _render_full_bracket(pods: List[PodDict]) -> str:
    """Full bracket grid: first round, quarterfinals, semifinals, championship."""
    r1_parts = []
    qf_parts = []
    for pod in pods:
        a, b = pod["first_round"]
        r1_parts.append(
            f'<div class="cfp-game">{render_team_card_html(a)}{render_team_card_html(b)}</div>'
        )
        qf_parts.append(
            f'<div class="cfp-game">{render_team_card_html(pod["bye"], bye_slot=True)}'
            f'<div class="cfp-await">vs Winner {int(a["seed"])}/{int(b["seed"])}</div></div>'
        )

    sf_top = '<div class="cfp-game"><div class="cfp-await">Winner QF1 vs Winner QF2</div></div>'
    sf_bottom = '<div class="cfp-game"><div class="cfp-await">Winner QF3 vs Winner QF4</div></div>'
    title = '<div class="cfp-title-game">National Championship</div>'

    return (
        '<div class="cfp-round-headers">'
        '<div class="cfp-round-header">First Round<small>Campus Sites</small></div>'
        '<div class="cfp-round-header">Quarterfinals<small>Bowl Sites</small></div>'
        '<div class="cfp-round-header">Semifinals<small>Bowl Sites</small></div>'
        '<div class="cfp-round-header">Semifinals<small>Bowl Sites</small></div>'
        '<div class="cfp-round-header">National Championship</div>'
        "</div>"
        '<div class="cfp-bracket-grid">'
        f'<div class="cfp-round-col">{"".join(r1_parts[:2])}</div>'
        f'<div class="cfp-round-col">{"".join(qf_parts[:2])}</div>'
        f'<div class="cfp-round-col">{sf_top}</div>'
        f'<div class="cfp-round-col">{"".join(r1_parts[2:])}{"".join(qf_parts[2:])}{sf_bottom}</div>'
        f'<div class="cfp-round-col">{title}</div>'
        "</div>"
    )


def _render_round_view(pods: List[PodDict]) -> str:
    rounds = build_bracket_rounds(pods)
    parts = ['<div class="cfp-round-view">']

    parts.append("<section><h3>First Round</h3>")
    for game in rounds["first_round"]:
        a, b = game["team_a"], game["team_b"]
        parts.append(
            f'<div class="cfp-matchup-line">#{int(a["seed"])} {html.escape(a["team"])} '
            f'vs #{int(b["seed"])} {html.escape(b["team"])}</div>'
        )
    parts.append("</section>")

    parts.append("<section><h3>Quarterfinals</h3>")
    for qf in rounds["quarterfinals"]:
        bye = qf["bye_team"]
        parts.append(
            f'<div class="cfp-matchup-line">#{int(bye["seed"])} {html.escape(bye["team"])} '
            f'vs {html.escape(qf["feeds_from"])}</div>'
        )
    parts.append("</section>")

    parts.append("<section><h3>Semifinals</h3>")
    parts.append('<div class="cfp-matchup-line">Winner QF1 vs Winner QF2</div>')
    parts.append('<div class="cfp-matchup-line">Winner QF3 vs Winner QF4</div>')
    parts.append("</section>")

    parts.append("<section><h3>National Championship</h3>")
    parts.append('<div class="cfp-matchup-line">Semifinal winners</div>')
    parts.append("</section></div>")
    return "".join(parts)


def _render_matchup_cards(pods: List[PodDict]) -> str:
    cards = ['<div class="cfp-matchup-cards">']
    for pod in pods:
        a, b = pod["first_round"]
        bye = pod["bye"]
        cards.append(
            f'<div class="cfp-matchup-card">'
            f"{render_team_card_html(a)}"
            f'<div class="cfp-vs">vs</div>'
            f"{render_team_card_html(b)}"
            f'<div class="cfp-matchup-footer">Winner plays '
            f"#{int(bye['seed'])} {html.escape(str(bye['team']))}</div>"
            f"</div>"
        )
    cards.append("</div>")
    return "".join(cards)


def render_bracket_html(
    pods: List[PodDict],
    metadata: Dict[str, Any],
    view_mode: ViewMode = "full",
    standalone: bool = False,
) -> str:
    """Single renderer for Streamlit display and file export."""
    rules_title = html.escape(str(metadata.get("ruleset_label", "")))
    rules_short = html.escape(str(metadata.get("ruleset_short", "")))
    season = metadata.get("season", "")
    week = metadata.get("week", "")

    banner = (
        f'<div class="cfp-rules-banner"><strong>{rules_title}</strong>'
        f"<span>{rules_short}</span></div>"
    )

    if view_mode == "round":
        body = _render_round_view(pods)
    elif view_mode == "matchups":
        body = _render_matchup_cards(pods)
    else:
        body = _render_full_bracket(pods)

    inner = (
        f'<div class="cfp-bracket-wrap">'
        f"<h2 style='margin:0 0 8px 0;font-size:1.1rem'>"
        f"Projected CFP Bracket — {season} · Week {week}</h2>"
        f"{banner}{body}</div>"
    )

    if not standalone:
        return inner

    css = _load_css()
    return (
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/>"
        f"<title>CFP Bracket {season} Week {week}</title>"
        f"<style>{css}</style></head><body style='background:#0B0F17;margin:0;padding:16px'>"
        f"{inner}</body></html>"
    )


def render_bracket_component(
    pods: List[PodDict],
    metadata: Dict[str, Any],
    view_mode: ViewMode = "full",
    height: int = 720,
) -> None:
    """Render bracket in Streamlit via components.html."""
    html_content = render_bracket_html(pods, metadata, view_mode=view_mode, standalone=False)
    components.html(html_content, height=height, scrolling=True)


def export_bracket_html(
    pods: List[PodDict],
    metadata: Dict[str, Any],
    output_path: Path,
    view_mode: ViewMode = "full",
) -> Path:
    """Write standalone HTML export using the same renderer."""
    html_content = render_bracket_html(pods, metadata, view_mode=view_mode, standalone=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html_content, encoding="utf-8")
    return output_path


def export_bracket_csv(pods: List[PodDict], output_path: Path) -> Path:
    """Export pod/matchup rows to CSV."""
    rows: List[Dict[str, Any]] = []
    for pod in pods:
        a, b = pod["first_round"]
        bye = pod["bye"]
        rows.append(
            {
                "pod_id": pod["pod_id"],
                "round": "first",
                "seed_a": a["seed"],
                "team_a": a["team"],
                "seed_b": b["seed"],
                "team_b": b["team"],
                "bye_seed": bye["seed"],
                "bye_team": bye["team"],
                "quarterfinal_id": pod["quarterfinal_id"],
                "semifinal_side": pod["semifinal_side"],
            }
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        output_path.write_text("", encoding="utf-8")
        return output_path
    buf = StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    output_path.write_text(buf.getvalue(), encoding="utf-8")
    return output_path


__all__ = [
    "build_bracket_pods",
    "enrich_pods",
    "render_bracket_html",
    "render_bracket_component",
    "export_bracket_html",
    "export_bracket_csv",
    "render_team_card_html",
]
