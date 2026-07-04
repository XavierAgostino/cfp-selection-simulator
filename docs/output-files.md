# Output Files

Every run writes reproducible artifacts under `data/output/`. Generated files are gitignored; directory structure is tracked via `.gitkeep` files.

---

## Run identity

| Term | Meaning | Example |
|------|---------|---------|
| `run_id` | Season/week group | `2025_week15` |
| `scenario_id` | `base` or config-hash variant | `base`, `a13f9c2b4e5d6f70` |
| `stem` | Output-safe identifier | base: `2025_week15`; scenario: `2025_week15__a13f9c2b4e5d6f70` |

Base pipeline runs use `scenario_id: "base"` and `stem === run_id`. Future weight-variant runs use `stem: "{run_id}__{scenario_id}"` so API directories never collide.

**Naming:**

- **CSV/HTML artifacts** (rankings, fields, brackets, audits, manifests): `{run_id}_{artifact}.{ext}` for base runs, e.g. `2025_week15_rankings.csv`
- **API exports** (`data/output/api/`): scenario-safe stems under `runs/{stem}/`

---

## Directory layout

```
data/output/
├── api/          JSON API consumed by the web app (see below)
├── rankings/     Composite ranking tables
├── fields/       Selected 12-team playoff fields
├── brackets/     Seeded bracket CSV + HTML
├── audits/       Selection audit JSON
├── validation/   Backtest result tables
├── reports/      Reserved for future exports
└── runs/         Manifest JSON per run
```

Example base run: `2025_week15_rankings.csv`

---

## Rankings CSV

Path: `data/output/rankings/{run_id}_rankings.csv`

| Column | Description |
|--------|-------------|
| `team` | Team name |
| `rank` | Composite rank (1 = best) |
| `composite_score` | Weighted composite (0–1 normalized components) |
| `resume_score` | Colley + win% blend |
| `predictive_score` | Massey + Elo blend |
| `sor` | Strength of Record |
| `sos` | Strength of Schedule |
| `colley_rating` | Raw Colley rating |
| `massey_rating` | Raw Massey rating |
| `elo_rating` | Raw Elo rating |
| `win_pct` | Win percentage in dataset |

When using sample mode, `conference` and `conf_champ` are added during enrichment (not always present in CSV export — check field CSV for bid context).

---

## Field CSV

Path: `data/output/fields/{run_id}_field.csv`

| Column | Description |
|--------|-------------|
| `rank` | Pre-selection composite rank |
| `team` | Team name |
| `composite_score` | Composite at selection time |
| `conference` | Conference label |
| `conf_champ` | Champion status (`Yes (CONF)` or `No`) |
| `bid_type` | `AUTO` or `AT-LARGE` |

---

## Bracket CSV

Path: `data/output/brackets/{run_id}_bracket.csv`

| Column | Description |
|--------|-------------|
| `seed` | Bracket seed (1–12) |
| `team` | Team name |
| `rank` | Composite rank at selection |
| `conference` | Conference |
| `conf_champ` | Champion label |
| `is_bye` | First-round bye flag |
| `composite_score` | Composite score |
| `wins` / `losses` | Record if available |

---

## Bracket HTML

Path: `data/output/brackets/{run_id}_bracket.html`

Standalone HTML bracket visualization. Open with `sroom open --latest`.

---

## Audit JSON

Path: `data/output/audits/{run_id}_audit.json`

```json
{
  "season": 2025,
  "week": 15,
  "ruleset": "2025_plus",
  "steps": [{"step": "...", "message": "..."}],
  "log": ["..."],
  "displaced_team": null,
  "first_four_out": [...]
}
```

---

## Manifest JSON

Path: `data/output/runs/{run_id}_manifest.json`

| Field | Description |
|-------|-------------|
| `simulator_version` | Package version |
| `run_id` | Season/week identity (`2025_week15`) |
| `scenario_id` | `base` or config-hash variant |
| `ruleset` | `2024` or `2025_plus` |
| `data_source` | `sample` or `cfbd` |
| `season` / `week` | Run parameters |
| `ranking_model` | e.g. `composite_v1` |
| `config_hash` | Hash of config + weights |
| `weights` | Active resume/predictive/SOR/SOS weights |
| `generated_at` | ISO timestamp (UTC) |
| `outputs` | Map of artifact keys to paths |
| `n_games` / `n_teams` | Dataset stats |

Use manifests with `sroom reproduce` to re-run seasons.

---

## Validation CSV

Path: `data/output/validation/` (multiple files)

Produced by `sroom validate`. See [Historical Validation](research/historical-validation.md) for `committee_replication.csv`, `era_selection_validation.csv`, `predictive_validation.csv`, and legacy `backtest_results.csv`.

`sroom validate` also refreshes `data/output/api/validation.json` — the web
contract behind the `/validation` dashboard (schema in
[api-contracts.md](api-contracts.md)). Its headline summary mirrors the
Markdown report: committee/selection means exclude outlier seasons, and the
predictive summary covers composite rows only.

---

## Calibration artifacts

Path: `data/output/calibration/`

Produced by `sroom calibrate` (v2 research mode — never feeds the production
pipeline or the web app):

- `calibration.json` — machine-readable contract: experiments, per-year
  metrics, deltas vs baseline, 2022/2024 holdout checks, decision labels
- `calibration.md` — human-readable report
- `calibration.csv` — one summary row per experiment
- `committee-emulation.json` — committee-aligned candidate assessments derived
  deterministically from `calibration.json`
- `committee-emulation.md` / `committee-emulation.csv` — report and table views

See [Calibration & Ablation Harness](research/calibration.md) and
[Committee Emulation Lite](research/committee-emulation.md).

---

## Inspecting latest outputs

```bash
sroom outputs --latest
```

---

## JSON API (`data/output/api/`)

Written automatically at the end of every `sroom run` (re-exportable with
`sroom export`). This is what the web app serves via `/api/data/`.

```
data/output/api/
├── runs.json           Index of all exported runs + which one is latest
├── latest.json         Metadata for the latest run (weights, config_hash, counts)
├── rankings.json       Latest full composite table
├── field.json          Latest 12-team field, bids, bubble, audit trail
├── bracket.json        Latest seeded bracket (pods + rounds)
├── audit.json          Latest selection audit
├── team-resumes.json   Latest per-team resumes (summary for all ranked teams; full detail for field, bubble, and top-ranked teams)
├── sensitivity.json    Latest Selection Stability (when generated)
├── validation.json     Historical validation summary (repo-level, written by sroom validate)
├── team-assets.json    Logos and colors keyed by team name
└── runs/{stem}/        Per-run copies of the payloads above, e.g.:
    └── 2025_week15/
        rankings.json field.json bracket.json audit.json
        team-resumes.json sensitivity.json
```

Scenario stems prevent weight-variant collisions, e.g. `runs/2025_week15__a13f9c2b4e5d6f70/`.

Schema: [api-contracts.md](api-contracts.md) (`schema_version: 1`), validated
by the pydantic models in `src/api_contracts/models.py` and round-trip tested
in `tests/test_api_contracts.py`.

**Records vs rankings:** Composite rankings use `ranking_games_df` (model window).
Displayed W-L in JSON and the web app use `record_games_df`, which may include
conference championship games when live data is available. `record_meta` on
`rankings.json` and `latest.json` describes the label and window (demo fixture,
FBS-only, model-window, CCG inclusion).

---

## Related

- [User Guide](user-guide.md)
- [Configuration](configuration.md)
- [CLI Reference](cli-reference.md)
- [Web App](web-app.md)
