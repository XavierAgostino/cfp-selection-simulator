# Data Sources

## CollegeFootballData (CFBD)

Primary data source for FBS teams, games, scores, and conferences.

- API: https://collegefootballdata.com
- Python client: `cfbd` package
- Rate limits: respect CFBD terms; cache responses locally under `data/cache/`

## Conference championship games

Conference championship handling is data-dependent:

- **When available:** CFBD lists conference championship games under regular-season weeks **14–16** (varies by year) with `notes` containing `Championship`. Live mode fetches these via `fetch_conference_championship_games()` and uses winners for auto-bid labels.
- **Before CCG results exist:** Falls back to conference-record leaders, documented tiebreakers, and simulated CCG resolution where needed (`src/pipeline/live.py`, `src/selection/conference_champions.py`).

See [CFP Committee Alignment](cfp-committee-alignment.md) and [Limitations & Ethics](limitations-and-ethics.md).

## Caching

- Game data cached as Parquet: `data/cache/cfbd/{year}/games_w{week}.parquet` (legacy `games_week{N}` also read)
- Sample dataset for offline demos: `data/processed/sample/sample_games.csv`

## Environment

Set `CFBD_API_KEY` in `.env` (see `.env.example`).

## Reproducibility

Every pipeline run writes `manifest.json` with simulator version, ruleset, config hash, active weights, and timestamp.

---

## Related

- [Output Files](../output-files.md)
- [Configuration](../configuration.md)
