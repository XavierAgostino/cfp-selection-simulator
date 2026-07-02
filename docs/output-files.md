# Output Files

Every run writes reproducible artifacts under `data/output/`. Generated files are gitignored; directory structure is tracked via `.gitkeep` files.

---

## Directory layout

```
data/output/
├── rankings/     Composite ranking tables
├── fields/       Selected 12-team playoff fields
├── brackets/     Seeded bracket CSV + HTML
├── audits/       Selection audit JSON
├── validation/   Backtest result tables
├── reports/      Reserved for future exports
└── runs/         Manifest JSON per run
```

Naming convention: `{year}_week{week}_{artifact}.{ext}`

Example: `2025_week15_rankings.csv`

---

## Rankings CSV

Path: `data/output/rankings/{year}_week{week}_rankings.csv`

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

Path: `data/output/fields/{year}_week{week}_field.csv`

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

Path: `data/output/brackets/{year}_week{week}_bracket.csv`

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

Path: `data/output/brackets/{year}_week{week}_bracket.html`

Standalone HTML bracket visualization. Open with `sroom open --latest`.

---

## Audit JSON

Path: `data/output/audits/{year}_week{week}_audit.json`

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

Path: `data/output/runs/{year}_week{week}_manifest.json`

| Field | Description |
|-------|-------------|
| `simulator_version` | Package version |
| `ruleset` | `2024` or `2025_plus` |
| `data_source` | `sample` or `cfbd` |
| `season` / `week` | Run parameters |
| `ranking_model` | e.g. `composite_v1` |
| `config_hash` | Hash of config + weights |
| `generated_at` | ISO timestamp (UTC) |
| `outputs` | Map of artifact keys to paths |
| `n_games` / `n_teams` | Dataset stats |

Use manifests with `sroom reproduce` to re-run seasons.

---

## Validation CSV

Path: `data/output/validation/backtest_results.csv`

Produced by `sroom validate`. Columns vary by backtest version; see [Historical Validation](research/historical-validation.md).

---

## Inspecting latest outputs

```bash
sroom outputs --latest
```

---

## Related

- [User Guide](user-guide.md)
- [Configuration](configuration.md)
- [CLI Reference](cli-reference.md)
