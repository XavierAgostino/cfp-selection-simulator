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
  rankings.json  field.json  bracket.json  audit.json  team-resumes.json  sensitivity.json   # latest run (flat copies)
  team-assets.json               # passthrough of data/cache/team_assets.json (or sample)
  runs/{year}_week{week}/        # per-run dirs, same 6 files
    rankings.json field.json bracket.json audit.json team-resumes.json sensitivity.json
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
      "run_id": "2025_week15",
      "scenario_id": "base",
      "season": 2025,
      "week": 15,
      "ruleset": "2025_plus",          // "2024" | "2025_plus"
      "data_source": "sample",          // "cfbd" | "sample"
      "champion_source": "cfbd",        // how champs were determined
      "generated_at": "...",
      "has_bracket": true,              // false if rank-only run
      "has_sensitivity": true,          // false if run predates Selection Stability
      "simulator_version": "3.0.0",
      "config_hash": "a13f9c2b4e5d6f70",
      "weights": {
        "resume": 0.40,
        "predictive": 0.30,
        "sor": 0.20,
        "sos": 0.10
      },
      "label": "2025 Week 15 · Base"
    }
  ]
}
```

**Run identity:** `run_id` groups season/week (`2025_week15`). `scenario_id` distinguishes weight variants under the same week. Base pipeline runs use `scenario_id: "base"` and `stem === run_id`. Scenario runs use `stem: "{run_id}__{scenario_id}"` (typically the config hash) so API directories never collide.

Example scenario entry:

```jsonc
{
  "stem": "2025_week15__a13f9c2b4e5d6f70",
  "run_id": "2025_week15",
  "scenario_id": "a13f9c2b4e5d6f70",
  "label": "2025 Week 15 · a13f9c2b4e5d6f70",
  ...
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

## sensitivity.json

Selection Stability: Monte Carlo weight-perturbation results
(`src/validation/sensitivity.py`). It varies **model weights only** — never
future game outcomes; conference-champion labels are fixed per run. Frequencies
are 0–1 on the wire (the UI renders percentages).

```jsonc
{
  "schema_version": 1, "season": 2025, "week": 15,
  "ruleset": "2025_plus",
  "generated_at": "...",
  "n_scenarios": 1000,
  "random_seed": 42,
  "perturbation_spec": {
    "method": "uniform_relative_weight_perturbation",
    "relative_range": 0.10,             // each weight × U(0.90, 1.10), clamp ≥0, renormalize to 1.0
    "base_weights": { "resume": 0.40, "predictive": 0.30, "sor": 0.20, "sos": 0.10 }  // the run's actual weights
  },
  "base_field_cutoff": {                // cross-links to the deterministic field
    "final_at_large_team": "Oregon",  "final_at_large_score": 0.4122,
    "first_team_out": "Oregon State", "first_team_out_score": 0.2780
  },
  "teams": [                            // bubble scope: base field + first/next four out + displaced (~20)
    {
      "team": "Oregon", "abbreviation": "ORE",
      "logo_url": "https://...", "primary_color": "#154733",
      "selection_frequency": 0.394,     // share of scenarios in the projected field
      "in_field_count": 394,
      "n_scenarios": 1000,
      "base_rank": 10,
      "base_seed": 10,                  // int | null (null when out of base field)
      "base_selected": true,
      "base_status": "in_field",        // "in_field" | "first_out" | "next_out" | "out"
      "status": "bubble",               // "lock" ≥0.99 | "likely_in" ≥0.75 | "bubble" ≥0.25 | "likely_out" >0.01 | "out"
      "median_rank": 10,                // median composite rank across scenarios
      "most_common_outcome": "in_field",// "in_field" | "first_out" | "out"
      "primary_risk": "weight_sensitivity" // "none" | "weight_sensitivity" | "auto_bid_displacement" | "composite_gap"
    }
  ]
}
```

`n_scenarios` + `random_seed` + `perturbation_spec` fully reproduce a run.
Missing file ⇒ the web UI omits Selection Stability surfaces entirely (no proxy).
See `docs/research/sensitivity-analysis.md` for methodology.

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
