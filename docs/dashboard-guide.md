# Dashboard Guide

The Streamlit dashboard provides an interactive view of rankings, field selection, brackets, and audit trails.

---

## Launching

```bash
make dashboard
# or
cfp-sim dashboard
```

Opens `app/streamlit_app.py` at `http://localhost:8501` by default.

---

## Sidebar settings

| Control | Description |
|---------|-------------|
| **Season** | 2024–2030 |
| **Week** | Analysis week (5–15) |
| **Use sample fixture data** | Offline demo without API key |

When sample mode is enabled, games load from `data/processed/sample/sample_games.csv` with conference champion labels applied.

---

## Tabs

### Rankings

Top 25 teams by composite score with team logos. Shows composite, résumé, and predictive scores per row.

### Playoff Field

Split view of **Automatic Bids** (conference champions) and **At-Large Bids**, plus **First Four Out** bubble teams.

### Bracket

Interactive Plotly bracket with team logos on nodes. Requires season ≥ 2024.

### Team Résumés

Select a team from the top 25 to view rank, composite, résumé, predictive, SOR, and SOS with logo.

### Component Views

Scatter plot: résumé vs predictive score (bubble size = SOS).

### Selection Audit

Human-readable audit log from field selection (same content as audit JSON `log` field).

### Methodology

Embeds key research docs: format history, model methodology, limitations.

---

## Sample vs live data

| Mode | Setup |
|------|-------|
| Sample | Check "Use sample fixture data" — no API key |
| Live | Uncheck sample; set `CFBD_API_KEY` in `.env` |

If live data fails, the dashboard shows an error with guidance to enable sample mode.

---

## Exporting reports

The dashboard is read-only for exploration. To export files:

```bash
cfp-sim run --year 2025 --week 15 --sample
cfp-sim open --latest
```

HTML bracket and CSVs are written to `data/output/`.

---

## Screenshots

Add screenshots to `docs/assets/` and reference here after capturing from a local `make demo` + `make dashboard` run.

---

## Related

- [Quickstart](quickstart.md)
- [User Guide](user-guide.md)
- [Output Files](output-files.md)
