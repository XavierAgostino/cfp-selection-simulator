"""Dashboard design tokens and global CSS injection."""

from __future__ import annotations

import streamlit as st

# Institutional sports analytics palette
COLORS = {
    "bg": "#0B0F17",
    "panel": "#111827",
    "panel_2": "#1F2937",
    "border": "#2D3748",
    "text": "#F9FAFB",
    "muted": "#9CA3AF",
    "accent": "#C0392B",
    "success": "#16A34A",
    "warning": "#F59E0B",
    "danger": "#DC2626",
    "gold": "#D4AF37",
    "logo_tile_bg": "#F8FAFC",
}

BADGE_STYLES: dict[str, dict[str, str]] = {
    "default": {
        "bg": "rgba(148,163,184,0.14)",
        "color": "#CBD5E1",
        "border": "rgba(148,163,184,0.35)",
    },
    "auto": {"bg": "rgba(212,175,55,0.16)", "color": "#D4AF37", "border": "rgba(212,175,55,0.35)"},
    "atlarge": {
        "bg": "rgba(96,165,250,0.14)",
        "color": "#93C5FD",
        "border": "rgba(96,165,250,0.35)",
    },
    "bye": {"bg": "rgba(22,163,74,0.14)", "color": "#86EFAC", "border": "rgba(22,163,74,0.35)"},
    "first_out": {
        "bg": "rgba(245,158,11,0.14)",
        "color": "#FCD34D",
        "border": "rgba(245,158,11,0.35)",
    },
    "displaced": {
        "bg": "rgba(220,38,38,0.14)",
        "color": "#FCA5A5",
        "border": "rgba(220,38,38,0.35)",
    },
    "sample": {
        "bg": "rgba(245,158,11,0.14)",
        "color": "#FCD34D",
        "border": "rgba(245,158,11,0.35)",
    },
    "live": {"bg": "rgba(22,163,74,0.14)", "color": "#86EFAC", "border": "rgba(22,163,74,0.35)"},
    "rules": {
        "bg": "rgba(148,163,184,0.14)",
        "color": "#E2E8F0",
        "border": "rgba(148,163,184,0.35)",
    },
}


def inject_global_css() -> None:
    """Inject dashboard-wide CSS for panels, badges, logo tiles, and typography."""
    st.markdown(
        f"""
        <style>
        .stApp {{
            background-color: {COLORS["bg"]};
        }}
        .run-context {{
            color: {COLORS["muted"]};
            font-size: 0.92rem;
            margin-bottom: 1rem;
            letter-spacing: 0.01em;
        }}
        .sample-banner {{
            background: {COLORS["panel_2"]};
            border: 1px solid {COLORS["warning"]};
            border-radius: 10px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            color: {COLORS["text"]};
        }}
        .sample-banner strong {{
            color: {COLORS["warning"]};
        }}
        .pending-banner {{
            background: rgba(245,158,11,0.12);
            border: 1px solid {COLORS["warning"]};
            border-radius: 10px;
            padding: 0.65rem 1rem;
            margin-bottom: 1rem;
            color: {COLORS["text"]};
        }}
        .panel-card {{
            background: {COLORS["panel"]};
            border: 1px solid {COLORS["border"]};
            border-radius: 12px;
            padding: 1rem 1.1rem;
            margin-bottom: 0.75rem;
        }}
        .panel-card h4 {{
            margin: 0 0 0.75rem 0;
            color: {COLORS["text"]};
            font-size: 0.95rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }}
        .metric-card {{
            background: {COLORS["panel"]};
            border: 1px solid {COLORS["border"]};
            border-radius: 12px;
            padding: 0.85rem 1rem;
        }}
        .metric-card .label {{
            color: {COLORS["muted"]};
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }}
        .metric-card .value {{
            color: {COLORS["text"]};
            font-size: 1.35rem;
            font-weight: 700;
            margin-top: 0.25rem;
        }}
        .badge {{
            display: inline-block;
            padding: 0.15rem 0.45rem;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            margin-right: 0.25rem;
        }}
        .logo-tile {{
            width: 34px;
            height: 34px;
            border-radius: 8px;
            background: {COLORS["logo_tile_bg"]};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
            overflow: hidden;
        }}
        .logo-tile img {{
            max-width: 26px;
            max-height: 26px;
            object-fit: contain;
        }}
        .logo-tile-lg {{
            width: 72px;
            height: 72px;
            border-radius: 16px;
            background: {COLORS["logo_tile_bg"]};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255,255,255,0.08);
            margin-bottom: 0.75rem;
        }}
        .logo-tile-lg img {{
            max-width: 56px;
            max-height: 56px;
            object-fit: contain;
        }}
        .logo-fallback {{
            font-size: 0.72rem;
            font-weight: 800;
            color: #334155;
        }}
        .logo-tile-lg .logo-fallback {{
            font-size: 1.1rem;
        }}
        .team-row {{
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.45rem 0;
            border-bottom: 1px solid rgba(45,55,72,0.6);
        }}
        .team-row:last-child {{
            border-bottom: none;
        }}
        .team-row-main {{
            flex: 1;
            min-width: 0;
        }}
        .team-row-title {{
            color: {COLORS["text"]};
            font-weight: 600;
            font-size: 0.95rem;
        }}
        .team-row-meta {{
            color: {COLORS["muted"]};
            font-size: 0.82rem;
            margin-top: 0.15rem;
        }}
        .audit-step {{
            background: {COLORS["panel"]};
            border: 1px solid {COLORS["border"]};
            border-left: 4px solid {COLORS["accent"]};
            border-radius: 10px;
            padding: 0.85rem 1rem;
            margin-bottom: 0.75rem;
        }}
        .audit-step h5 {{
            margin: 0 0 0.5rem 0;
            color: {COLORS["text"]};
            font-size: 0.92rem;
        }}
        .audit-step ul {{
            margin: 0;
            padding-left: 1.1rem;
            color: {COLORS["muted"]};
            font-size: 0.88rem;
        }}
        .bracket-report-card {{
            background: {COLORS["panel"]};
            border: 1px solid {COLORS["border"]};
            border-radius: 14px;
            padding: 1rem 1.25rem;
            margin-top: 0.5rem;
        }}
        .profile-headline {{
            color: {COLORS["text"]};
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0.25rem 0 0.5rem 0;
        }}
        .profile-sub {{
            color: {COLORS["muted"]};
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
