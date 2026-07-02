# Data Sources

## CollegeFootballData (CFBD)

Primary data source for FBS teams, games, scores, and conferences.

- API: https://collegefootballdata.com
- Python client: `cfbd` package
- Rate limits: respect CFBD terms; cache responses locally under `data/cache/`

## Caching

- Game data cached as Parquet: `data/cache/{year}/games_week{N}.parquet`
- Sample dataset for offline demos: `data/processed/sample/sample_games.csv`

## Environment

Set `CFBD_API_KEY` in `.env` (see `.env.example`).

## Reproducibility

Every pipeline run writes `manifest.json` with simulator version, ruleset, config hash, and timestamp.
