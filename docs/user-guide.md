# User Guide

For analysts, researchers, and fans who want to understand what the simulator produces and how to use it without reading source code.

---

## Where to explore results

The **Next.js web app** ([Web App Guide](web-app.md)) is the primary product surface: dashboard, bracket, bubble watch, team resumes, and Selection Stability. Run `make web` to start it.

> [!TIP]
> Use **Run Analysis** in the site header to launch sample or live runs without leaving the browser (requires a persistent Node server and Python on the same machine).

> [!NOTE]
> Selection Room explains model outputs under published CFP rules. It does not replicate private committee deliberations. See [Limitations & Ethics](research/limitations-and-ethics.md).

---

## What the simulator produces

| Output | Description |
|--------|-------------|
| **Rankings** | Composite score ranking all FBS teams in the dataset |
| **Playoff field** | 12 teams selected under 5+7 rules |
| **Seeds** | Seeds 1–12 with bye flags |
| **Bracket** | First-round matchups and HTML visualization |
| **Audit trail** | Step-by-step selection log (JSON) |
| **Manifest** | Run metadata for reproducibility (includes active weights and config hash) |
| **Selection Stability** | Monte Carlo weight-perturbation frequency for bubble-scope teams (when `sensitivity.json` exists) |

> [!TIP]
> For final CFP-style field analysis, prefer **Week 16** when your data source includes conference championship results. The sample demo stops at Week 15; live CFBD runs default to Week 16 unless cached data ends earlier.

---

## How selection works

### Automatic bids (5)

The five highest-ranked **conference champions** receive automatic bids. Champions are identified from `conf_champ` labels on rankings (live CFBD data or sample champion mapping).

### At-large bids (7)

Remaining spots go to the highest-ranked teams not already selected, up to 12 total.

### Displacement

If an automatic bid team ranks outside the top 12 by composite score, they still qualify. The lowest-ranked at-large team is displaced and recorded in the audit.

### Seeding

| Ruleset | Seeding | Byes |
|---------|---------|------|
| **2024** | Top 4 conference champions → seeds 1–4 | Champion byes |
| **2025+** | Straight by final ranking | Top 4 overall |

> [!IMPORTANT]
> **2024 vs 2025+** use different bye rules. Always check the run's `ruleset` in the manifest or web run header before comparing seeding across seasons.

First-round pairings: 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9.

Details: [CFP Format History](research/cfp-format-history.md)

---

## How to read the outputs

See [Output Files](output-files.md) for full column definitions and run identity (`run_id`, `scenario_id`, `stem`).

**Quick tips:**

- **Rankings CSV**: `composite_score` is the primary sort key; component columns show the resume vs predictive breakdown.
- **Record column (web)**: labeled FBS record, Demo record, or Model-window record from `record_meta`. Sample runs use a partial mid-season fixture (week 5+), so demo records are not full-season totals.
- **Field CSV**: `bid_type` is `AUTO` or `AT-LARGE`.
- **Bracket CSV**: `is_bye` marks teams with first-round byes; `seed` is the final bracket seed.
- **Audit JSON**: `steps` are structured; `log` is human-readable text.
- **Manifest JSON**: records ruleset, config hash, active weights, data source, output paths, and `record_meta`.

### Team resumes

Every ranked team has a resume entry in `team-resumes.json`. Top 40, field, and bubble teams get **full** detail (schedule, why-in, concerns). Other ranked teams get a **summary** with scores and record only. Click any ranked team in the web app to open the drawer.

---

## How to read Selection Stability

> [!NOTE]
> Selection Stability varies **model weights only**. It does not simulate future games, injuries, or alternate championship outcomes.

Selection Stability measures how often a team remains in the **projected field** when model weights are perturbed (Monte Carlo). It appears on the web app's Bubble and Team Resume views when `sensitivity.json` exists for the run.

**What it means:** A bubble team with low selection frequency is sensitive to methodology assumptions; a high frequency team is more robust under tested weight changes.

**What it does not mean:**

- Not win probability or matchup prediction
- Not simulation of future game outcomes, injuries, or alternate championship results
- Conference champion labels stay fixed per run

Full methodology: [Sensitivity Analysis](research/sensitivity-analysis.md)

---

## Common workflows

### Run current season (live)

```bash
export CFBD_API_KEY="..."
sroom run --year 2025 --week 15
```

Or use **Run Analysis** in the web app (Create tab in the run header).

### Run Sample demo (offline)

```bash
make demo
```

### Compare 2024 vs 2025 seeding rules

```bash
sroom run --config configs/2024.yaml --sample
sroom run --config configs/2025.yaml --sample
sroom outputs --latest
```

Compare `bracket.csv` bye assignments between runs.

### Reproduce a historical season

```bash
sroom reproduce --season 2024
```

Requires CFBD API key and cached or fetched game data.

### Historical validation

```bash
sroom validate --years 2014:2024
```

Three tracks: committee replication, era-correct selection, and predictive validation. Results under `data/output/validation/`. See [Historical Validation](research/historical-validation.md).

### Export bracket report

```bash
sroom bracket --year 2025 --week 15 --sample --html
sroom open --type bracket --year 2025 --week 15
```

---

## Sample vs live data

| Mode | Flag | API key | Champions |
|------|------|---------|-----------|
| Sample | `--sample` | Not required | From `sample_champions.csv` |
| Live | (default) | Required | From CFBD when available |

Demo mode uses 110-game sample data with five labeled conference champions so byes and auto-bids look realistic.

---

## Related docs

- [Web App](web-app.md)
- [Quickstart](quickstart.md)
- [CLI Reference](cli-reference.md)
- [Configuration](configuration.md)
- [Research index](research/index.md)
