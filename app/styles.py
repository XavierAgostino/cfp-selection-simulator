"""Dashboard design tokens and global CSS injection."""

from __future__ import annotations

import streamlit as st

COLORS = {
    "bg": "#0B0F17",
    "panel": "#111827",
    "panel_soft": "rgba(17, 24, 39, 0.72)",
    "border_soft": "rgba(148, 163, 184, 0.10)",
    "text": "#F9FAFB",
    "muted": "#9CA3AF",
    "accent": "#C0392B",
    "success": "#16A34A",
    "warning": "#F59E0B",
    "danger": "#DC2626",
    "gold": "#D4AF37",
    "logo_tile_bg": "#F8FAFC",
    "sidebar": "#0F131D",
}

BADGE_STYLES: dict[str, dict[str, str]] = {
    "default": {
        "bg": "rgba(148,163,184,0.14)",
        "color": "#CBD5E1",
        "border": "rgba(148,163,184,0.25)",
    },
    "auto": {"bg": "rgba(212,175,55,0.16)", "color": "#D4AF37", "border": "rgba(212,175,55,0.30)"},
    "atlarge": {
        "bg": "rgba(96,165,250,0.14)",
        "color": "#93C5FD",
        "border": "rgba(96,165,250,0.30)",
    },
    "bye": {"bg": "rgba(22,163,74,0.14)", "color": "#86EFAC", "border": "rgba(22,163,74,0.30)"},
    "first_out": {
        "bg": "rgba(245,158,11,0.14)",
        "color": "#FCD34D",
        "border": "rgba(245,158,11,0.30)",
    },
    "displaced": {
        "bg": "rgba(220,38,38,0.14)",
        "color": "#FCA5A5",
        "border": "rgba(220,38,38,0.30)",
    },
    "sample": {
        "bg": "rgba(245,158,11,0.14)",
        "color": "#FCD34D",
        "border": "rgba(245,158,11,0.30)",
    },
    "live": {"bg": "rgba(22,163,74,0.14)", "color": "#86EFAC", "border": "rgba(22,163,74,0.30)"},
    "rules": {
        "bg": "rgba(148,163,184,0.14)",
        "color": "#E2E8F0",
        "border": "rgba(148,163,184,0.25)",
    },
    "context": {
        "bg": "rgba(148,163,184,0.10)",
        "color": "#CBD5E1",
        "border": "rgba(148,163,184,0.18)",
    },
}


def inject_global_css() -> None:
    """Inject dashboard-wide CSS for layout hierarchy, panels, and Streamlit overrides."""
    st.markdown(
        f"""
        <style>
        :root {{
            --bg: {COLORS["bg"]};
            --panel: {COLORS["panel"]};
            --panel-soft: {COLORS["panel_soft"]};
            --border-soft: {COLORS["border_soft"]};
            --text: {COLORS["text"]};
            --muted: {COLORS["muted"]};
            --accent: {COLORS["accent"]};
        }}

        .stApp {{
            background-color: var(--bg);
        }}

        /* Content width — keep analyst console readable */
        .block-container {{
            max-width: 1180px;
            padding-top: 2.5rem;
            padding-bottom: 4rem;
            padding-left: 2.5rem;
            padding-right: 2.5rem;
        }}

        /* Header */
        h1 {{
            font-size: 1.65rem !important;
            font-weight: 700 !important;
            margin-bottom: 0.35rem !important;
            letter-spacing: -0.01em;
        }}
        .app-subtitle {{
            color: var(--muted);
            font-size: 0.92rem;
            margin: 0 0 1rem 0;
            line-height: 1.45;
        }}

        /* Context badges */
        .context-bar {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            margin-bottom: 0.75rem;
        }}

        /* Info callout — not title-level */
        .info-callout {{
            background: rgba(148, 163, 184, 0.06);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.85rem;
            color: var(--muted);
            font-size: 0.8rem;
            line-height: 1.45;
        }}

        .sample-banner {{
            background: rgba(245, 158, 11, 0.06);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.85rem;
            color: var(--text);
            font-size: 0.8rem;
        }}
        .sample-banner strong {{
            color: {COLORS["warning"]};
        }}

        .pending-banner {{
            background: rgba(245, 158, 11, 0.08);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.85rem;
            color: var(--text);
            font-size: 0.8rem;
        }}

        /* Primary content card — background only, no outline */
        .app-card {{
            background: var(--panel);
            border: none;
            border-radius: 14px;
            padding: 16px 18px;
            margin-bottom: 0.75rem;
            box-shadow: none;
        }}
        .app-card-flat {{
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 0;
            margin-bottom: 0.5rem;
        }}
        .app-card h4, .app-card-flat h4, .panel-card h4 {{
            margin: 0 0 0.65rem 0;
            color: var(--muted);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.07em;
            text-transform: uppercase;
        }}
        .panel-card {{
            background: var(--panel);
            border: none;
            border-radius: 14px;
            padding: 16px 18px;
            margin-bottom: 0.75rem;
            box-shadow: none;
        }}

        /* Section headings */
        .section-heading {{
            color: var(--muted);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            margin: 1rem 0 0.35rem 0;
            padding-bottom: 0.35rem;
            border-bottom: none;
        }}
        .section-heading:first-child {{
            margin-top: 0;
        }}

        /* Metrics */
        .metric-card {{
            background: var(--panel);
            border: none;
            border-radius: 12px;
            padding: 0.85rem 1rem;
            min-height: 72px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }}
        .metric-card-sm {{
            background: var(--panel);
            border: none;
            border-radius: 10px;
            padding: 0.65rem 0.75rem;
            min-height: 58px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }}
        .metric-card .label, .metric-card-sm .label {{
            color: var(--muted);
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 0.25rem;
        }}
        .metric-card .value {{
            color: var(--text);
            font-size: 1.15rem;
            font-weight: 700;
            line-height: 1.25;
            word-break: break-word;
        }}
        .metric-card-sm .value {{
            color: var(--text);
            font-size: 0.95rem;
            font-weight: 700;
            line-height: 1.2;
        }}

        /* Badges */
        .badge {{
            display: inline-block;
            border-radius: 999px;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
            margin-right: 0.2rem;
        }}

        /* Logo tiles — hard constraints */
        .logo-tile, .bracket-logo-tile {{
            width: 32px;
            height: 32px;
            min-width: 32px;
            max-width: 32px;
            border-radius: 8px;
            background: {COLORS["logo_tile_bg"]};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
        }}
        .logo-tile img, .bracket-logo-tile img {{
            max-width: 24px !important;
            max-height: 24px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain;
            display: block;
        }}
        .logo-tile-lg {{
            width: 56px;
            height: 56px;
            min-width: 56px;
            border-radius: 12px;
            background: {COLORS["logo_tile_bg"]};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin-bottom: 0.5rem;
        }}
        .logo-tile-lg img {{
            max-width: 42px !important;
            max-height: 42px !important;
            object-fit: contain;
        }}
        .logo-fallback {{
            font-size: 0.68rem;
            font-weight: 800;
            color: #334155;
        }}
        .logo-tile-lg .logo-fallback {{
            font-size: 0.95rem;
        }}

        /* Team rows */
        .team-row {{
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.35rem 0;
        }}
        .team-row + .team-row {{
            border-top: none;
            margin-top: 0.15rem;
            padding-top: 0.15rem;
        }}
        .team-row-main {{
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        }}
        .team-row-title {{
            color: var(--text);
            font-weight: 600;
            font-size: 0.88rem;
        }}
        .team-row-meta {{
            color: var(--muted);
            font-size: 0.78rem;
            flex-shrink: 0;
        }}

        /* Overview field table */
        .field-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.86rem;
        }}
        .field-table th {{
            color: var(--muted);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            text-align: left;
            padding: 0 0.5rem 0.35rem 0;
            border-bottom: none;
        }}
        .field-table td {{
            padding: 0.45rem 0.5rem 0.45rem 0;
            vertical-align: middle;
            color: var(--text);
        }}
        .field-table tr:hover td {{
            background: rgba(148, 163, 184, 0.04);
        }}
        .field-table .num {{
            color: var(--muted);
            font-variant-numeric: tabular-nums;
            width: 2.5rem;
        }}
        .field-table .team-cell {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        /* Rankings table */
        .rankings-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.86rem;
        }}
        .rankings-table th {{
            color: var(--muted);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            text-align: left;
            padding: 0 0.5rem 0.35rem 0;
            border-bottom: none;
        }}
        .rankings-table th.num, .rankings-table td.num {{
            text-align: right;
            font-variant-numeric: tabular-nums;
        }}
        .rankings-table td {{
            padding: 0.4rem 0.5rem 0.4rem 0;
            vertical-align: middle;
            color: var(--text);
        }}
        .rankings-table tbody tr:hover td {{
            background: rgba(148, 163, 184, 0.04);
        }}
        .rankings-table .team-cell {{
            display: flex;
            align-items: center;
            gap: 0.45rem;
        }}

        /* Audit timeline */
        .audit-step {{
            border-left: 2px solid rgba(192, 57, 43, 0.7);
            background: rgba(17, 24, 39, 0.65);
            padding: 14px 16px;
            margin-bottom: 12px;
            border-radius: 10px;
            border-top: none;
            border-right: none;
            border-bottom: none;
        }}
        .audit-step h5 {{
            margin: 0 0 0.4rem 0;
            color: var(--text);
            font-size: 0.85rem;
            font-weight: 600;
        }}
        .audit-step ul {{
            margin: 0;
            padding-left: 1rem;
            color: var(--muted);
            font-size: 0.82rem;
            line-height: 1.45;
        }}
        .audit-step li {{
            margin-bottom: 0.15rem;
        }}

        /* Profile / resume */
        .profile-headline {{
            color: var(--text);
            font-size: 1.35rem;
            font-weight: 700;
            margin: 0 0 0.35rem 0;
        }}
        .profile-sub {{
            color: var(--muted);
            font-size: 0.88rem;
            margin-bottom: 1rem;
        }}
        .case-panel {{
            background: var(--panel);
            border: none;
            border-radius: 12px;
            padding: 14px 16px;
        }}
        .case-panel h4 {{
            margin: 0 0 0.6rem 0;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--muted);
        }}
        .case-list {{
            margin: 0;
            padding: 0;
            list-style: none;
        }}
        .case-list li {{
            color: var(--text);
            font-size: 0.86rem;
            padding: 0.25rem 0;
            line-height: 1.4;
        }}
        .case-list li.positive::before {{
            content: "✓ ";
            color: {COLORS["success"]};
        }}
        .case-list li.warning::before {{
            content: "⚠ ";
            color: {COLORS["warning"]};
        }}

        /* Bracket wide container exception */
        .bracket-wide .block-container {{
            max-width: 100%;
        }}

        /* Sidebar — minimal separation, no hard border */
        [data-testid="stSidebar"] {{
            background: {COLORS["sidebar"]};
            border-right: none !important;
            box-shadow: inset -1px 0 0 rgba(148, 163, 184, 0.06);
        }}
        [data-testid="stSidebar"] .block-container {{
            padding-top: 1.5rem;
            padding-left: 1.25rem;
            padding-right: 1.25rem;
        }}
        [data-testid="stSidebar"] h1,
        [data-testid="stSidebar"] h2,
        [data-testid="stSidebar"] h3 {{
            font-size: 0.72rem !important;
            font-weight: 700 !important;
            letter-spacing: 0.07em !important;
            text-transform: uppercase !important;
            color: var(--muted) !important;
        }}
        [data-testid="stSidebar"] [data-testid="stVerticalBlock"] > div {{
            gap: 0.35rem;
        }}
        [data-testid="stSidebar"] .stButton > button[kind="primary"] {{
            background: var(--accent);
            border: none;
        }}
        [data-testid="stSidebar"] .stButton > button[kind="secondary"] {{
            background: transparent;
            border: 1px solid var(--border-soft);
            color: var(--text);
        }}
        [data-testid="stSidebar"] .stButton > button:disabled {{
            opacity: 0.35;
            border: 1px solid var(--border-soft);
            background: transparent;
            color: var(--muted);
        }}

        .sidebar-run-summary {{
            color: var(--text);
            font-size: 0.88rem;
            font-weight: 600;
            margin: 0.15rem 0;
        }}
        .sidebar-run-meta {{
            color: var(--muted);
            font-size: 0.78rem;
            margin: 0.1rem 0 0.5rem 0;
            line-height: 1.4;
        }}

        /* Tabs */
        .stTabs [data-baseweb="tab-list"] {{
            gap: 0.15rem;
            border-bottom: none;
            margin-bottom: 0.5rem;
        }}
        .stTabs [data-baseweb="tab"] {{
            color: var(--muted) !important;
            font-size: 0.82rem;
            font-weight: 600;
            padding: 0.5rem 0.65rem;
        }}
        .stTabs [aria-selected="true"] {{
            color: var(--text) !important;
            background: transparent !important;
        }}
        .stTabs [data-baseweb="tab-highlight"] {{
            background-color: var(--accent) !important;
        }}
        .stTabs [data-baseweb="tab-border"] {{
            display: none;
        }}

        /* Subheaders in main area */
        [data-testid="stMain"] h2, [data-testid="stMain"] h3 {{
            font-size: 1rem !important;
            font-weight: 700 !important;
            margin-bottom: 0.75rem !important;
        }}

        /* Strip Streamlit block chrome (borders around columns/sections) */
        [data-testid="stVerticalBlockBorderWrapper"] {{
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            gap: 0.25rem !important;
        }}

        [data-testid="column"] {{
            border: none !important;
            background: transparent !important;
        }}

        [data-testid="stMain"] [data-testid="stVerticalBlock"] > div {{
            gap: 0.35rem;
        }}

        [data-testid="stTabContent"] {{
            padding-top: 0.75rem;
            border: none !important;
        }}

        .element-container {{
            margin-bottom: 0.25rem;
        }}

        /* Inputs — flat, no box shadow */
        [data-testid="stSelectbox"] > div,
        [data-testid="stTextInput"] > div {{
            background: transparent;
        }}

        div[data-baseweb="select"] > div,
        div[data-baseweb="input"] > div {{
            border-color: rgba(148, 163, 184, 0.15) !important;
            background-color: {COLORS["panel"]} !important;
        }}

        /* Plotly container */
        [data-testid="stPlotlyChart"] {{
            border: none !important;
            background: transparent !important;
        }}

        header[data-testid="stHeader"] {{
            background: transparent;
            border-bottom: none;
        }}

        /* Reduce column gap whitespace */
        [data-testid="stHorizontalBlock"] {{
            gap: 0.75rem;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
