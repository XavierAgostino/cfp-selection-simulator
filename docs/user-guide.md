# User Guide

For analysts, researchers, and fans who want to understand what the simulator produces and how to use it without reading source code.

---

## What the simulator produces

| Output | Description |
|--------|-------------|
| **Rankings** | Composite score ranking all FBS teams in the dataset |
| **Playoff field** | 12 teams selected under 5+7 rules |
| **Seeds** | Seeds 1–12 with bye flags |
| **Bracket** | First-round matchups and HTML visualization |
| **Audit trail** | Step-by-step selection log (JSON) |
| **Manifest** | Run metadata for reproducibility |

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

First-round pairings: 5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9.

Details: [CFP Format History](research/cfp-format-history.md)

---

## How to read the outputs

See [Output Files](output-files.md) for full column definitions.

**Quick tips:**

- **Rankings CSV** — `composite_score` is the primary sort key; component columns show résumé vs predictive breakdown.
- **Field CSV** — `bid_type` is `AUTO` or `AT-LARGE`.
- **Bracket CSV** — `is_bye` marks teams with first-round byes; `seed` is final bracket seed.
- **Audit JSON** — `steps` are structured; `log` is human-readable text.
- **Manifest JSON** — records ruleset, config hash, data source, and output paths.

---

## Common workflows

### Run current season (live)

```bash
export CFBD_API_KEY="..."
cfp-sim run --year 2025 --week 15
```

### Run sample demo (offline)

```bash
make demo
```

### Compare 2024 vs 2025 seeding rules

```bash
cfp-sim run --config configs/2024.yaml --sample
cfp-sim run --config configs/2025.yaml --sample
cfp-sim outputs --latest
```

Compare `bracket.csv` bye assignments between runs.

### Reproduce a historical season

```bash
cfp-sim reproduce --season 2024
```

Requires CFBD API key and cached or fetched game data.

### Historical validation

```bash
cfp-sim validate --years 2014:2023
```

Results: `data/output/validation/backtest_results.csv`. See [Historical Validation](research/historical-validation.md).

### Export bracket report

```bash
cfp-sim bracket --year 2025 --week 15 --sample --html
cfp-sim open --type bracket --year 2025 --week 15
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

- [Quickstart](quickstart.md)
- [CLI Reference](cli-reference.md)
- [Dashboard Guide](dashboard-guide.md)
- [Configuration](configuration.md)
