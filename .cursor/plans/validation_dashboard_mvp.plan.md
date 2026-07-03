---
name: Validation Dashboard MVP
overview: Phase 3 (institutional) first slice — surface the existing Python historical validation (committee replication, era-correct selection, predictive accuracy) as a web JSON contract and a /validation page. Repo-level artifact (not per-run). No hosted work, no engine math changes, honest "model vs committee" framing.
todos:
  - id: vd1-export
    content: "VD-1 Export: build_validation_payload + validation.json; builder + tests (code done, uncommitted)"
    status: completed
  - id: vd2-contract
    content: "VD-2 Web contract: TS types, getValidationData, graceful missing-file (fixture pending)"
    status: in_progress
  - id: vd3-page
    content: "VD-3 Page: /validation dashboard — three tracks, empty state (code done; design polish pending)"
    status: in_progress
  - id: vd4-docs
    content: "VD-4 Nav + docs: nav done; web-app/api-contracts/cli-reference/output-files pending"
    status: in_progress
  - id: vd5-design-polish
    content: "VD-5 Design/copy polish — trust hierarchy, scope labels, verdict lines, predictive signal rename (frontend only)"
    status: pending
isProject: false
---

# Validation Dashboard MVP — Phase 3 (institutional), slice 1

**Written:** 2026-07-03, immediately after the Scenario Lab MVP shipped (`d81e91a`).

**Locked roadmap position:** Phase 3 = "validation dashboard / export / share URLs".
This plan builds the **validation dashboard** only. Export (share images/CSV) and
share URLs are later slices.

## Why this next

The engine already computes a rich historical validation suite over 2014–2024 in
`src/validation/` — committee replication, era-correct selection, predictive
forecasting — but it only lands as CSV + markdown in `data/output/validation/`.
None of it reaches the **web contract** (`data/output/api/`). The vision's north-star
step 6 ("test what would change" is Scenario Lab; the trust layer is validation) and
the doctrine ("the model differs from the committee — say so honestly") both want
this surfaced. This is the highest-value untouched vision item.

## Doctrine (unchanged, must hold)

- JSON under `data/output/api/` is the web contract; pages never read CSV/DuckDB.
- Local/open-source mode must keep working. Validation needs historical seasons, so
  `validation.json` is **optional** — the page shows an honest empty state when it's
  absent (same pattern as `sensitivity.json`), never proxy numbers.
- No hosted adapters, no game-outcome simulation. Copy: "projected/simulated", the
  model **differs from** the committee; never "official", never "win probability".
- No engine math changes — this is an **export + presentation** slice over existing
  validation results.

## Key design decision — repo-level, not per-run

Validation is computed across a **span of seasons**, independent of any single
selection run. So `validation.json` is a **flat, repo-level** artifact at
`data/output/api/validation.json` — NOT under `runs/{stem}/` and NOT tied to `?run=`.
It is fetched top-level (like a site-wide "how good is this model historically"
report), and the `/validation` page is run-agnostic.

## Data shapes (from `src/validation/`, verified)

- **Committee replication** (`CommitteeValidationResult`): `year, spearman_top12,
  top12_overlap_ratio/label, bubble_overlap_ratio/label, is_outlier, notes`.
- **Era-correct selection** (`SelectionValidationResult`): `year, era, ruleset,
  rule_target, field_overlap_ratio/label, correct_field_size, sim_field, ref_field,
  false_positives, false_negatives, first_team_out_{match,ref,sim}, displacement_count,
  seeding_exact_match, seeding_within_one, notes`.
- **Predictive** (`PredictiveMetrics`): `year, model, brier_score, win_accuracy,
  margin_mae, margin_rmse`.
- `OUTLIER_YEARS` flags seasons the committee behaved anomalously.

## Slices

### VD-1 Export contract (engine)
- `src/api_contracts/build.py`: `build_validation_payload(committee, selection,
  predictive, *, years, target, outlier_years) -> dict` mapping the three result
  lists to a versioned JSON contract:
  ```jsonc
  {
    "schema_version": 1,
    "generated_at": "...",
    "years": [2014, ..., 2024],
    "target": "all",
    "outlier_years": [...],
    "summary": { "committee": {mean_spearman, mean_field_overlap, ...},
                 "selection": {correct_field_rate, mean_field_overlap, ...},
                 "predictive": {mean_brier, mean_win_accuracy, ...} },
    "committee": [ per-year rows ],
    "selection": [ per-year rows (fields + false pos/neg + seeding) ],
    "predictive": [ per-year rows ]
  }
  ```
- `src/api_contracts/export.py`: `export_validation_api(payload, api_dir)` writes
  `validation.json`. Wire it from `write_validation_outputs` (or the `validate`
  command) so `sroom validate` refreshes the web artifact too.
- Tests: `tests/test_validation_contract.py` — payload shape, summary aggregation,
  outlier passthrough, empty-track handling; a fixture built from crafted result
  objects (no live CFBD needed).

### VD-2 Web contract (types + fetch)
- `web/lib/types.ts`: `ValidationData` + row types mirroring VD-1.
- `web/lib/data.ts`: `getValidationData()` — top-level fetch of
  `api/validation.json`, `NotFoundError` → `null` (optional artifact).
- Fixture under the web test fixtures so page renders offline.

### VD-3 Page (`/validation`)
- Server component `web/app/validation/page.tsx` + client sections.
- Three tracks, honest framing:
  - **Committee alignment** — Spearman + top-12 overlap per year, mean headline,
    outlier years marked; a small per-year bar/line of overlap.
  - **Era-correct selection** — field overlap, correct field size, first-team-out
    match, seeding accuracy; false in/out chips per year.
  - **Predictive** — Brier / win-accuracy / margin error, model vs baseline.
- Empty state when `validation.json` absent: explain it needs `sroom validate`
  over historical seasons (copy-paste command), like the first-run wizard.
- Reuse existing chart/badge primitives; monochrome palette; gold for emphasis
  sparingly. No new "win probability" language anywhere.

### VD-4 Nav + docs
- `web/lib/nav.ts` + `web/components/icons/nav-icons.ts`: add `/validation`
  (a hugeicon that reads as "verify/chart") after Methodology or near it.
- Docs: `docs/web-app.md` (page + contract), `docs/api-contracts.md`
  (validation.json schema), `docs/cli-reference.md` (`validate` now refreshes the
  web artifact). Flip Layer 4 / step 6 partial in the vision assessment; roadmap note.

### VD-5 Design/copy polish (frontend only — ship before calling validation done)

**Verdict:** Page is structurally right; final 15% is trust hierarchy, not rebuild.
No backend changes. No math changes. No new charts unless using existing payload.

**Validation Dashboard** (`ValidationDashboard.tsx`, `validationFormat.ts`):

| Priority | Change |
|----------|--------|
| P1 | Rename "Game Prediction" → **"Predictive Signal"**; subtitle: completed games, not live forecast |
| P1 | Scope Field Accuracy headline — `2024 Field Accuracy` or `Validated Seasons`; subtitle names artifact scope |
| P1 | **Validation scope** strip: Retrospective · completed seasons · era-correct rules · outlier seasons labeled |
| P2 | Interpretation chips on headline cards (e.g. "Strong alignment with top-12 ordering") |
| P2 | Plain-English verdict line per section (committee, era-correct field, predictive) |
| P2 | Era-correct rules callout near top: judged against format that applied that year |
| P2 | Predictive: "Higher accuracy is better · lower Brier is better" + baseline comparison hint |
| P2 | Footer metadata row: generated_at, target, outlier seasons excluded |

**Scenario Lab** (same polish pass — `ScenarioLabWorkspace.tsx`):

- Empty right panel: preview checklist (field, seed, bubble, bracket changes)
- Base-weight copy: "Adjust one or more weights to create a scenario..."
- Disabled jobs: "This deployment can open existing scenarios, but cannot create new ones."

**Tone:** Honest, non-official. No win-probability or future-forecast language.

Run `tsc` + `pnpm build` after.

## Out of scope (later Phase 3 slices)
- Export (PNG/CSV/share-card generation) and share URLs.
- Any per-run validation or live-season backtest UI.
- Hosted adapters.
