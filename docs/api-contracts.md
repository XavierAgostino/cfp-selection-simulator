# Selection Room — JSON API Contracts (schema_version 1)

The Python engine emits stable JSON under `data/output/api/`. The Next.js app in `web/`
consumes these files verbatim (snake_case on the wire; TS types mirror snake_case — no
mapping layer). Pydantic v2 models in `src/api_contracts/models.py` are the source of
truth; this doc mirrors them.

## Output layout

```
data/output/api/
  runs.json                      # index across all runs (drives season/week switcher)
  latest.json                    # meta for most recent run
  rankings.json  field.json  bracket.json  audit.json  team-resumes.json   # latest run (flat copies)
  team-assets.json               # passthrough of data/cache/team_assets.json (or sample)
  runs/{year}_week{week}/        # per-run dirs, same 5 files
    rankings.json field.json bracket.json audit.json team-resumes.json
```

All top-level payloads carry `schema_version: 1`.

## Shared object: TeamSlot

```jsonc
{
  "seed": 1,                    // int | null (null when out of field)
  "rank": 1,                    // composite rank
  "team": "Notre Dame",
  "abbreviation": "ND",         // string | null; UI falls back to derived initials
  "conference": "FBS Independents",
  "logo_url": "https://a.espncdn.com/i/teamlogos/ncaa/500/87.png",  // string | null
  "primary_color": "#0C2340",   // string | null
  "secondary_color": "#C99700", // string | null
  "bid_type": "auto",           // "auto" | "at_large"
  "is_bye": true,               // seed <= 4
  "composite_score": 0.866,
  "resume_score": 0.990,
  "predictive_score": 0.735,
  "sor": 0.91,
  "sos": 0.44,
  "record": { "wins": 11, "losses": 1 }
}
```

## runs.json

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-02T12:00:00Z",
  "latest": { "season": 2025, "week": 15, "stem": "2025_week15" },
  "runs": [
    {
      "stem": "2025_week15",
      "season": 2025,
      "week": 15,
      "ruleset": "2025_plus",          // "2024" | "2025_plus"
      "data_source": "sample",          // "cfbd" | "sample"
      "champion_source": "cfbd",        // how champs were determined
      "generated_at": "...",
      "has_bracket": true,              // false if rank-only run
      "simulator_version": "3.0.0"
    }
  ]
}
```

## latest.json

```jsonc
{
  "schema_version": 1,
  "product": "Selection Room",
  "simulator_version": "3.0.0",
  "season": 2025, "week": 15, "stem": "2025_week15",
  "ruleset": "2025_plus",
  "seeding_mode": "straight",           // "champion_byes" | "straight"
  "bye_rule": "top_four_seeds",
  "data_source": "sample",
  "champion_source": "...",
  "config_hash": "...",
  "generated_at": "...",
  "assets_source": "cache",             // "cache" | "sample"
  "weights": { "resume": 0.5, "predictive": 0.3, "sor": 0.1, "sos": 0.1 },
  "counts": { "n_games": 800, "n_teams": 134 },
  "has_bracket": true
}
```

## rankings.json

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15, "generated_at": "...",
  "teams": [
    {
      "rank": 1, "team": "...", "abbreviation": "...", "conference": "...",
      "composite_score": 0.0, "resume_score": 0.0, "predictive_score": 0.0,
      "sor": 0.0, "sos": 0.0,
      "is_conference_champion": true,
      "champion_of": "SEC",             // string | null
      "record": { "wins": 0, "losses": 0 },
      "in_field": true,
      "bid_type": "auto",               // "auto" | "at_large" | null
      "seed": 1,                        // int | null
      "logo_url": "...", "primary_color": "...", "secondary_color": "..."
    }
  ]
}
```

## field.json

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15,
  "ruleset": "2025_plus", "seeding_mode": "straight",
  "field": [ /* 12 TeamSlot, ordered by seed */ ],
  "auto_bids": [ /* TeamSlot */ ],
  "at_large_bids": [ /* TeamSlot */ ],
  "last_four_in": [ /* 4 lowest-ranked at-large TeamSlots */ ],
  "first_four_out": [ /* TeamSlot with seed:null */ ],
  "next_four_out": [ /* TeamSlot with seed:null */ ],
  "displaced_team": null,               // TeamSlot | null
  "champ_pulled_in": false
}
```

## bracket.json

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15,
  "ruleset": "2025_plus", "seeding_mode": "straight",
  "pods": [
    {
      "pod_id": "top_1",                // top_1 | top_2 | bottom_1 | bottom_2
      "first_round": [ /* TeamSlot, TeamSlot (e.g. seeds 8 & 9) */ ],
      "bye": { /* TeamSlot, seeds 1-4 */ },
      "quarterfinal_id": "QF1",
      "semifinal_side": "top"           // "top" | "bottom"
    }
  ],
  "rounds": {
    "first_round": [
      { "game_id": "FR1", "team_a": {/*TeamSlot*/}, "team_b": {/*TeamSlot*/}, "winner_to_seed": 1 }
    ],
    "quarterfinals": [
      { "game_id": "QF1", "bye_team": {/*TeamSlot*/}, "feeds_from": "FR1" }
    ],
    "semifinals": [ { "side": "top", "pods": ["QF1", "QF4"] } ],
    "championship": { "label": "CFP National Championship" }
  }
}
```

Pod pairs are seed-driven and identical across rulesets: 8/9→1, 5/12→4, 6/11→3, 7/10→2.

## audit.json

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15, "ruleset": "2025_plus",
  "steps": [ { "step": "auto_bids", "message": "..." } ],
  "phases": [ { "step": "auto_bids", "messages": ["..."] } ],   // grouped for timeline UI
  "log": [ "..." ],
  "displaced_team": null,
  "first_four_out": [ "Team A", "Team B" ]
}
```

Step values come from `src/selection/audit.py` `AuditStep` enum.

## team-resumes.json

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15,
  "teams": {
    "Notre Dame": {
      "team": "...", "abbreviation": "...", "conference": "...",
      "logo_url": "...", "primary_color": "...", "secondary_color": "...",
      "rank": 1, "seed": 1, "bid_type": "auto", "in_field": true,
      "is_conference_champion": true, "champion_of": null,
      "record": { "wins": 0, "losses": 0 },
      "scores": { "composite": 0.0, "resume": 0.0, "predictive": 0.0, "sor": 0.0, "sos": 0.0 },
      "component_ranks": { "resume": 1, "predictive": 3, "sor": 2, "sos": 40 },
      "why_in": [ "..." ],                // from src/api_contracts/selection_case.py
      "concerns": [ "..." ],
      "schedule": [
        { "week": 1, "opponent": "...", "opponent_rank": 14,   // int | null
          "location": "home",            // "home" | "away" | "neutral"
          "result": "W", "points_for": 31, "points_against": 17 }
      ]
    }
  }
}
```

Scope: top 40 teams by rank plus everyone in field/first-four-out/next-four-out.

## team-assets.json

Keyed by team name; passthrough of `src/assets/teams.py` `load_team_assets()`:

```jsonc
{ "Notre Dame": { "cfbd_id": 249, "espn_id": "87", "abbreviation": "ND",
                  "conference": "...", "logo": "https://...", "logo_source": "espn",
                  "primary_color": "#0C2340", "secondary_color": "#C99700" } }
```

## Error contract (web route handler)

`web/app/api/data/[...path]/route.ts` serves these files; missing file returns
HTTP 404 with `{ "error": "not_found" }` — the first-run setup gate keys off this.
