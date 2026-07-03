---
name: Scenario Lab MVP
overview: Review-verified plan for the Scenario Lab MVP — the missing north-star step 5 ("Test what would change"). Five PR-sized slices — engine scenario runs, weights through Option B jobs, ScenarioDiffService, /scenario-lab page, docs — all on local adapters. No hosted work, no DB page reads, no game-outcome simulation.
todos:
  - id: sl1-engine
    content: "SL-1 Engine: scenario-capable pipeline — RunOutputPaths scenario stems, manifest scenario_id/label, CLI --weights, latest.json gating"
    status: completed
  - id: sl2-jobs
    content: "SL-2 Jobs: weights through Option B — RunJobRequest.weights, spawn --weights, scenario-aware stem resolution"
    status: completed
  - id: sl3-diff
    content: "SL-3 ScenarioDiffService: web/lib/scenarioDiff.ts + GET /api/scenario/diff, ScenarioDiff types"
    status: completed
  - id: sl4-ui
    content: "SL-4 UI: /scenario-lab page — sliders, launch via job path, diff workspace (moved in/out, seeds, ranks, bubble)"
    status: completed
  - id: sl5-docs
    content: "SL-5 Docs: web-app.md Scenario Lab section, api-contracts manifest notes, vision assessment update"
    status: completed
isProject: false
---

# Scenario Lab MVP — Implementation Plan

**Written:** 2026-07-03, after the pre-Claude cleanup review. **Status: shipped 2026-07-03** — all five slices (SL-1…SL-5) implemented, typechecked, linted, built, and verified end-to-end (weighted job launch + diff on the live dev server; slider-rebalance and TS↔Python scenario-id parity fuzz-checked).

**Sources:** [`vision_progress_assessment_ca926609.plan.md`](vision_progress_assessment_ca926609.plan.md), [`docs/architecture/hosted-production.md`](../../docs/architecture/hosted-production.md), repo state at `d4fcaf7`.

---

## Part 1 — Repo review (verified 2026-07-03)

Confirmed by direct inspection and by running the suites:

| Claim from handoff | Verified |
|---|---|
| Phase 1A–1C, 2A contracts, Selection Stability done | ✅ matches code + runs index |
| Option B file-backed run jobs done locally | ✅ `web/lib/runJob.ts`, `web/app/api/run/` |
| Run Analysis workspace done (Create/Runs/Jobs) | ✅ `RunAnalysisDialog.tsx` |
| Dynamic `selection_case` resumes done | ✅ `src/api_contracts/selection_case.py`; `pytest tests/test_selection_case.py` → **10 passed** |
| DuckDB local run store done, JSON stays page contract | ✅ `src/store/`, catalog API falls back to `runs.json` |
| Hosted architecture documented, not implemented | ✅ doc only; no adapters in code |
| Scenario Lab not started | ✅ no page, no diff service, engine can't run scenarios (see gaps) |
| `tsc` / build pass | ✅ `tsc --noEmit` exit 0 |
| `pnpm lint` still fails on pre-existing hook issues | ❌ **outdated — lint now passes clean (exit 0)**. The optional Cursor lint cleanup evidently landed. **Decision resolved: nothing to fix or defer.** |

### The five concrete gaps Scenario Lab must close

1. **The engine cannot produce a scenario run.** `run_cmd` (`src/cli/main.py:157`) has no weights or scenario flags. `run_pipeline` always builds `RunOutputPaths(year, week)` (`src/pipeline/run.py:238`), whose stem is always `{year}_week{week}` — a custom-weights run today would **overwrite the base run's manifest, CSVs, and `runs/{stem}/` API dir**. `write_manifest` hardcodes `scenario_id = BASE_SCENARIO_ID` (`src/pipeline/run.py:95`). The 2A helpers (`scenario_stem()`, `BASE_SCENARIO_ID` in `src/pipeline/paths.py`) exist but nothing calls them with a non-base id — 2A shipped the *identity contract*, not scenario *execution*.
2. **The job path can't carry weights.** `RunJobRequest` is `{season, week, data_source}` only (`web/lib/runJob.ts:29`); `spawnEngine` passes no weight args (`runJob.ts:355`); `parseRunRequest` drops anything else; the `runs.json` stem fallback filters `scenario_id === "base"` (`runJob.ts:322`). (The primary `SELECTION_ROOM_EXPORT stem=` log-line resolution already works for any stem.)
3. **No `ScenarioDiffService`.** Named in the hosted doc as the boundary to introduce *during* Scenario Lab. Nothing exists.
4. **No Scenario Lab surface.** No page, no nav entry (`web/lib/nav.ts`).
5. **Scenario runs would hijack "latest."** `export_run_api` promotes whichever manifest is newest to `latest.json` + the flat API files (`src/api_contracts/export.py:142,235`). Launching a scenario would silently flip the site's default view to the scenario. Must be gated (Decision D4).

**Diff substrate is already sufficient in JSON:** `runs/{stem}/rankings.json` (full `RankingRow[]` with rank/composite/in_field/bid_type/seed) + `field.json` (field, auto/at-large, last four in, first four out, next four out, displaced) give everything the MVP diff needs. No DuckDB dependency required for v1.

---

## Part 2 — Decisions

**D1 — Dedicated page `/scenario-lab`, not a Run Analysis tab.** Run Analysis is operational control (create/switch/jobs, one modal). Scenario Lab is a thinking workspace: sliders + assumptions + diff cards + before/after table need real estate a modal can't give, and the diff must stay on screen while you iterate. They integrate (Scenario Lab launches through the same job path and its runs appear in the Runs tab with the existing Scenario badge) but do not collapse into one surface.

**D2 — `scenario_id` derived from integer weight percents:** `w{resume}-{predictive}-{sor}-{sos}`, e.g. `w45-25-20-10` → stem `2025_week15__w45-25-20-10`. Deterministic and idempotent: relaunching the same weights overwrites the same scenario, no run-list explosion. Sliders step in whole percents, so the id is always exact. If chosen weights equal the base run's weights, the UI blocks launch ("matches base run") rather than minting a fake scenario. `--scenario-id` stays available as a manual CLI override.

**D3 — Diff computed server-side in Node from JSON artifacts.** `getScenarioDiff(baseStem, scenarioStem)` lives in `web/lib/scenarioDiff.ts` (pure function over the two runs' `rankings.json` + `field.json`), exposed via `GET /api/scenario/diff?base=&scenario=`. Honors doctrine (JSON stays the contract), works in OSS mode with no DuckDB, and is exactly the local adapter shape the hosted doc reserves — the hosted implementation later swaps artifact reads for object storage/Postgres behind the same signature. **No diff logic scattered in React components.**

**D4 — Scenario runs never own `latest.json` or the flat API files.** In `export_run_api`, gate the `is_latest` block on `scenario_id == BASE_SCENARIO_ID`. Scenario runs write only `runs/{stem}/` + the runs index entry. The site's default view stays the latest *base* run; scenarios are reached explicitly via `?run=` (which is already how job completion navigates).

**D5 — Sensitivity still runs for scenario exports.** Same cost as base (<30s target), and the roadmap explicitly allows Selection Stability in Scenario Lab. Scenario runs get `sensitivity.json` for free; MVP diff does not depend on it.

**D6 — Lint: already clean; no pre-work needed.** (Handoff question answered by the repo itself.)

**D7 — Trust copy carries over.** Scenario Lab changes *model weights around the current run's data*. It does not simulate future game outcomes, alternate champions, or win probability — state this on the page, mirroring the Selection Stability tooltip doctrine. All field language stays "projected."

---

## Part 3 — Build order (each slice = one PR, engine before web)

### SL-1 — Engine: scenario-capable pipeline (Python)

- `src/pipeline/paths.py` — add `scenario_id: str = BASE_SCENARIO_ID` to `RunOutputPaths`; `stem` property returns `scenario_stem(run_stem(year, week), scenario_id)`. All CSV/manifest/API paths pick up the scenario stem automatically.
- `src/pipeline/run.py` — `run_pipeline(..., scenario_id: str = BASE_SCENARIO_ID)`; thread into `RunOutputPaths` and `write_manifest` (drop the hardcode; manifest gets real `scenario_id` + `build_run_label`).
- `src/cli/main.py` — `run` gains `--weights "resume=0.45,predictive=0.25,sor=0.20,sos=0.10"` (parsed into `RankingWeights`, which already validates sum≈1) and optional `--scenario-id`. When weights are supplied and differ from defaults, derive the id per D2; explicit `--scenario-id` wins.
- `src/api_contracts/export.py` — D4 gating: only base runs write `latest.json` + flat files (`_is_latest_run` result AND `scenario_id == BASE_SCENARIO_ID`). Index regeneration already scans all manifests — scenario entries appear with correct `scenario_id`/`weights`/`label` untouched.
- Tests (extend `tests/test_run_identity.py` + a new `tests/test_scenario_run.py`): scenario stem never collides with base paths; manifest carries scenario_id/label/weights; sample scenario run leaves base `runs/{run_id}/` and `latest.json` byte-identical; `runs.json` lists both with distinct `config_hash`.

*Exit: `sroom run --year 2025 --week 15 --sample --weights resume=0.45,predictive=0.25,sor=0.20,sos=0.10` produces `runs/2025_week15__w45-25-20-10/` and the site can already open it via `?run=` with zero web changes.*

### SL-2 — Jobs: weights through Option B (TypeScript, server)

- `web/lib/runJob.ts` — optional `weights` on `RunJobRequest`; `parseRunRequest` validates (four numbers, each 0–1, sum within 0.01 of 1); `spawnEngine` appends `--weights …` when present; `resolveStemFromRunsJson` matches the expected scenario_id (derived the same way) instead of hardcoding `"base"` when the request carried weights. Log-line resolution already handles scenario stems.
- `web/app/api/run/route.ts` — passthrough only (validation lives in `parseRunRequest`).
- Job UI compatibility: `jobSummaryLine` gains a weights suffix for scenario jobs; no other Run Analysis changes.

*Exit: `POST /api/run {season, week, data_source, weights}` → job succeeds → `stem` resolves to the scenario stem.*

### SL-3 — `ScenarioDiffService` (TypeScript, server)

- `web/lib/scenarioDiff.ts` — `getScenarioDiff(baseStem, scenarioStem): Promise<ScenarioDiff>`; reads both runs' `rankings.json` + `field.json` from disk (same read path as pages); **pure comparison logic in an exported pure function** so it's unit-testable and hosted-swappable.
- `ScenarioDiff` shape (new types, colocated or in `web/lib/types.ts`):
  - `base` / `scenario` run refs (stem, label, weights) + `weight_deltas`
  - `moved_in[]` / `moved_out[]` — team, bid_type, old/new rank, replaced-by pairing where derivable
  - `seed_changes[]` — full 12-slot before/after with movement
  - `rank_changes[]` — field + bubble universe (≈ top 25), old/new rank + composite delta
  - `bubble_changes` — membership deltas for last four in / first four out / next four out
  - `summary` — counts for the header chips
- `web/app/api/scenario/diff/route.ts` — `GET ?base=&scenario=`; 400 unless both stems exist and share the same `run_id` (same season/week family); never compares across seasons.

*Exit: curl the route against a base + SL-1 scenario and get a correct, typed diff.*

### SL-4 — UI: `/scenario-lab` page (the product slice)

- `web/lib/nav.ts` + `web/components/icons/nav-icons.ts` — nav entry.
- `web/app/scenario-lab/page.tsx` — server component; resolves active run + catalog like existing pages (respects `?run=`).
- `ScenarioLabWorkspace` (client), three zones:
  1. **Assumptions** — base-run banner (reuse `CurrentRunBanner` styling); four weight sliders, whole-percent steps, auto-normalize to 100 (adjusting one redistributes the remainder proportionally across unlocked others); reset-to-base; live derived label (`w45-25-20-10`); D7 trust line.
  2. **Launch** — POST `/api/run` with weights on the base run's season/week/data_source; poll job status/logs (extract the polling loop from `RunAnalysisDialog` into a shared `useRunJob` hook rather than duplicating it); disabled states: weights == base, job already active, capabilities disabled (show the existing deployment explainer). On success: refresh catalog, load diff in place — **do not navigate away**.
  3. **Diff** — summary chips (`+2 in · −2 out · 5 seed changes`); Moved In / Moved Out cards with team identity (logo/color via existing TeamAssets context); before/after seed table (1–12) with movement arrows; bubble delta lists; "Open scenario run" link (`?run=` navigation) for the full site view. Bracket impact in MVP = the seed table (pod-level bracket diff deferred).
- Also allow picking any *existing* scenario of the same `run_id` from the catalog to diff without launching — makes the page useful read-only and in deployments with run jobs disabled.

*Exit: change weights → launch → watch job → read diff, all on one page.*

### SL-5 — Docs + assessment

- `docs/web-app.md` — replace the "planned" Scenario Lab stub with the real workflow + trust language; job API table gains `weights`.
- `docs/api-contracts.md` — manifest/runs.json notes if any field semantics changed (expected: none; scenario fields already documented in 2A).
- `vision_progress_assessment_ca926609.plan.md` — flip the `scenario-lab` todo and Layer 3 status on ship.

---

## Part 4 — Explicitly out of scope (unchanged from handoff)

Future game-outcome simulation · custom conference champions · accounts · share links · hosted adapters (H1–H7) · Postgres · Trigger.dev · validation dashboard · moving pages to DB reads · Dirichlet perturbation.

Known pre-existing wart, not addressed here: a sample and a live run of the same season/week share one stem and overwrite each other; scenarios inherit this per weight-combo. Acceptable for MVP; noting for the hosted phase.

## Part 5 — Acceptance criteria

1. Scenario CLI run writes only `runs/{run_id}__{scenario_id}/` + index entry; base artifacts and `latest.json` untouched (test-enforced).
2. Run Analysis → Runs tab shows the scenario with the existing "Scenario" badge and correct weights line, with zero changes to that tab.
3. `/scenario-lab` completes the loop — adjust → launch → diff — and the diff matches a manual comparison of the two runs' JSON.
4. Read-only/OSS mode: page still renders and can diff existing runs; launch panel degrades to the deployment explainer.
5. `pytest`, `pnpm lint`, `tsc --noEmit`, `pnpm build` all green (all four currently green at `d4fcaf7`).

## Open questions for Xavier (non-blocking, defaults chosen)

- Slider granularity: whole percents (default) or finer?
- Should Scenario Lab offer `colley_share` too? Default **no** — it's a resume-internal mix, not one of the four composite weights.
- Scenario run retention: unlimited for MVP (idempotent ids limit growth); prune tooling later if needed.
