# Dashboard Guide

The **Next.js web app** ([Web App Guide](web-app.md)) is the primary product surface. This guide covers the **Streamlit analyst/legacy console** (`app/streamlit_app.py`).

The Streamlit dashboard does **not** include Selection Stability UI (Bubble board and resume stability blocks are web-only).

---

## Launching

```bash
make dashboard
# or
sroom dashboard
```

Opens `app/streamlit_app.py` at `http://localhost:8501` by default.

---

## Sidebar settings

| Control | Description |
|---------|-------------|
| **Season** | 2024–2030 |
| **Week** | Analysis week (5–15) |
| **Data source** | Sample fixture (offline demo) or Live CFBD data |
| **Run simulator** | Refresh results after changing season/week/source |
| **Export bracket HTML / CSV** | Write bracket viewer output to `data/output/` |

When settings change without clicking **Run simulator**, the dashboard shows the previous run and a pending-state message.

Sample mode displays a banner: demo results are illustrative, not official CFP projections.

---

## Tabs

### Overview (default)

Landing tab with metric cards (#1 team, auto/at-large counts, first team out), projected playoff field, and first-round matchups.

### Rankings

Structured table: Rank, Team, Conf, Composite, Resume, Predictive, SOR, SOS, Bid Status. Filters: All, Playoff Teams, Bubble, Conference Champions. Team logos use light neutral tiles for dark-mode contrast.

### Playoff Field

Three sections: **Automatic Bids**, **At-Large Bids**, **First Four Out**, with seed, conference, and bid badges.

### Bracket

Custom HTML/CSS bracket viewer (dark mode) with view modes:

| Mode | Description |
|------|-------------|
| **Full Bracket** | Desktop grid layout (horizontal scroll on narrow screens) |
| **Round View** | Vertical lists by round |
| **Matchup Cards** | First-round pairs with quarterfinal destination |

Export **HTML** (standalone file) or **CSV** (pod data) from the sidebar or Bracket tab. PNG export is not yet available.

**Advanced / Legacy chart** expander retains the Plotly bracket for fallback.

### Bubble Watch

Last Four In (#8–#11), First Four Out (#12–#15), Next Four Out (#16–#19). No Selection Stability board (see [Web App](web-app.md)).

### Team Resume

Team profile: logo tile, rank, bid badges, metric cards, and template-based selection case (why in / potential concerns).

### Components

Scatter plot: Resume Score vs Predictive Score (bubble size = SOS), colored by bid status, with quadrant labels.

### Selection Audit

Step-by-step timeline with badges (not raw log text).

### Methodology

Short summary cards with links to full docs in [docs/research/](research/index.md).

---

## Sample vs live data

| Mode | Setup |
|------|-------|
| Sample | Select **Sample fixture** — no API key |
| Live | Select **Live CFBD data**; set `CFBD_API_KEY` in `.env` |

If live data fails, the dashboard shows an error with guidance to use sample fixture data.

---

## Exporting reports

From the dashboard sidebar or Bracket tab:

- **Export bracket HTML** → `data/output/brackets/{run_id}_bracket.html`
- **Export bracket CSV** → `data/output/brackets/{run_id}_bracket_pods.csv`

Full pipeline exports via CLI:

```bash
sroom run --year 2025 --week 15 --sample
sroom open --latest
```

---

## Related

- [Web App](web-app.md) — primary product surface
- [Quickstart](quickstart.md)
- [User Guide](user-guide.md)
- [Output Files](output-files.md)
