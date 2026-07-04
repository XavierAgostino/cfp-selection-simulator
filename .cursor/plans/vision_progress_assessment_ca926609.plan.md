---
name: Vision Progress Assessment
overview: Selection Room v1 is feature-complete as a local/open-source product. All four layers shipped — Scenario Lab (d81e91a), Validation Dashboard (98f1934 + d1b3f38 hardening), and export/share primitives (rankings CSV, bracket share image, resume card). Next work is release hardening, documentation consistency, and optional hosted production planning. Shareable scenario URLs and hosted adapters (H1–H7) are future (v1.1+), not v1 blockers.
todos:
  - id: land-wip
    content: "Commit working tree: logo pipeline (PR A) and bracket FullBracket/RulesetBanner refactor (PR B) as separate commits"
    status: completed
  - id: phase1-polish
    content: "Close Phase 1A/1B polish: methodology + dashboard MetricTooltip, verify bracket share UX"
    status: completed
  - id: phase2a-scenario-id
    content: Add scenario_id / config_hash / weights to runs.json so weight variants do not collide
    status: completed
  - id: option-b-jobs
    content: "Option B: file-backed run jobs, capabilities probe, export lock, API routes"
    status: completed
  - id: dynamic-resumes
    content: "Run-grounded selection_case / why_in / concerns from active run data"
    status: completed
  - id: run-analysis-ux
    content: "Run Analysis modal (Create / Runs / Jobs), RunHeader, shared useRunCatalog"
    status: completed
  - id: duckdb-store
    content: "Phase 2C DuckDB run store — dual-write, CLI, catalog API; JSON remains page contract"
    status: completed
  - id: hosted-architecture-doc
    content: "Write docs/architecture/hosted-production.md + render bootstrap appendix; vision update"
    status: completed
  - id: scenario-lab
    content: "Build Scenario Lab MVP: weight sliders, normalize to 100%, launch scenario run, moved in/out/stable + field/bracket/bubble diff"
    status: completed
  - id: phase3-validation
    content: "Phase 3: validation dashboard MVP surfacing Python backtest/committee alignment data"
    status: completed
  - id: validation-data-slice
    content: "Validation hardening: fixture, docs, composite-only summary aggregation, outlier exclusion, export error logging"
    status: completed
  - id: run-analysis-preflight
    content: "Preflight: Run Analysis UX polish locally (not a new phase)"
    status: pending
  - id: export-share
    content: "Export primitives: bracket share image, rankings CSV download, resume card (web/components/share/)"
    status: completed
  - id: scenario-share-urls
    content: "Shareable scenario URLs: deep-link a scenario diff"
    status: pending
  - id: hosted-adapters-h1
    content: "Future: Hosted Architecture H1–H7 (adapters, worker, Postgres) — after export/share"
    status: pending
isProject: false
---

# Selection Room Vision — Progress Assessment

> **Stale (archived context):** This assessment predates V2.1–V2.4
> (`src/calibration/`, `sroom calibrate`). For current research status and
> promotion decisions, see
> [`docs/research/v2-tracks-research.md`](../../docs/research/v2-tracks-research.md).

**Last updated:** 2026-07-03 (v1 release hardening pass)

**Sources:** [`selection_room_vision_5f27cf0d.plan.md`](selection_room_vision_5f27cf0d.plan.md) (vision/doctrine), [`archive/vision_status_cleanup.plan.md`](archive/vision_status_cleanup.plan.md), [`archive/validation_dashboard_mvp.plan.md`](archive/validation_dashboard_mvp.plan.md). Implementation history for shipped layers lives in [`archive/`](archive/) — do not re-read those for current work.

**Current state:** **Selection Room v1 is feature-complete as a local/open-source product:** field/ranking/bracket/bubble explainability, browser run generation, dynamic team cases, Scenario Lab, Validation Dashboard, and export/share primitives are shipped. The next work is **release hardening, documentation consistency, and optional hosted production planning** — not more feature scope. Shareable scenario URLs are a v1.1 nice-to-have; hosted adapters (H1–H7) stay future.

---

## Four-layer current state

| Layer | Description | Status |
|-------|-------------|--------|
| **Layer 1 — Viewer** | Explainability, bracket, charts, stability UI | **Done** |
| **Layer 2 — Platform foundation** | Jobs, run workspace, dynamic resumes, local DuckDB | **Done locally** — JSON web contract; OSS workflow intact |
| **Layer 2H — Hosted production** | Vercel + worker + object storage + Postgres adapters | **Designed, not implemented** — see [`docs/architecture/hosted-production.md`](../../docs/architecture/hosted-production.md) |
| **Layer 3 — Decision platform** | Scenario Lab (what-if, diffs) | **Shipped** (`d81e91a`) — weights-only what-if with field/seed/bubble/rank diff, empty-state preview, honest copy |
| **Layer 4 — Institutional / share** | Validation dashboard, export, share URLs | **Shipped (v1)** — validation (`98f1934` + hardening) + export primitives (CSV, bracket image, resume card). Scenario share URLs deferred to v1.1 |

---

## North star (unchanged)

> Selection Room is a **guided decision platform**, not a dashboard.

| Step | Status |
|------|--------|
| 1. See the field | **Done** — Dashboard projected field, rankings, bubble board |
| 2. Understand the rule path | **Done** — Methodology + centralized tooltips |
| 3. Inspect any team | **Done** — Drawer + hover cards; `?run=` scoping; run-grounded `selection_case` |
| 4. Understand the bubble | **Done** — Cut-line chart + Selection Stability board + audit |
| 5. Test what would change | **Done, MVP** — Scenario Lab: reweight sliders → scenario run → diff. Weights-only; no game-outcome sim |
| 6. Validate (trust layer) | **Done** — `/validation`: committee / field / predictive tracks, trust-hierarchy copy, seeded fixture, honest aggregation |
| 7. Share / export | **Done, v1 primitives** — rankings CSV, bracket share image, resume card (`web/components/share/`) |

---

## Validation Dashboard — shipped and hardened

The `98f1934` commit shipped the page, exporter, nav, and trust-hierarchy copy
(Predictive Signal rename, interpretation chips, scope strip, verdict lines,
footer metadata). The follow-up data slice completed the vertical:

- `web/lib/fixtures/validation.json` — `/validation` renders offline via `pnpm seed-fixtures`
- Docs: `docs/api-contracts.md` (schema), `docs/web-app.md` (page), `docs/cli-reference.md`, `docs/output-files.md`
- **Honest aggregation** in `build_validation_payload`: committee/selection summary means exclude outlier seasons (matching CSV/Markdown), predictive headline is **composite-only** — never blended across baseline models
- Validation web-export failures are logged (`src/validation/reports.py`), not swallowed
- Contract tests updated: `tests/test_validation_contract.py`

**Tone constraints (permanent):** honest, non-official; no "official," no "committee got it wrong," no future win-probability language anywhere in validation or Scenario Lab.

---

## Scenario Lab — shipped

`/scenario-lab` with weight sliders (whole percents summing to 100), scenario
stems (`{run_id}__{scenario_id}`), server-side diff via
`GET /api/scenario/diff`, saved-scenario list, empty-state preview checklist,
and human-readable base run labels ("2025 Week 15 · Base"). Scenario runs never
own `latest.json`.

Remaining nice-to-haves (low priority, do not block export/share): catalog
refresh after launch without full reload; `?run=` deep-link on `/scenario-lab`.

---

## Summary scorecard

| Area | Status |
|------|--------|
| Phase 1A–1C Explainability / Bracket / Charts | **Done** |
| Phase 2A Contracts + SSI | **Done** |
| Phase 2B SSI UI | **Done** |
| Option B run jobs · Run Analysis workspace · dynamic resumes | **Done** (local/persistent-server) |
| Phase 2C DuckDB store | **Done** (local analytics; JSON web contract) |
| Layer 2H hosted architecture | **Designed** — adapters not built |
| Scenario Lab | **Shipped** (`d81e91a`) |
| Validation dashboard | **Shipped** (`98f1934` + hardening) |
| Export/share layer | **Shipped (v1 primitives)** — rankings CSV, bracket image, resume card |

---

## v1 is feature-complete — the job is now release, not scope

The local OSS product has crossed the v1 finish line. **Do not start new features.**
The sequence from here is **freeze → verify → document → tag release**:

1. **Freeze v1 feature scope** — no new analysis surfaces or product layers.
2. **Verify** — Python tests, web typecheck, web build, fresh-clone path, export flows, Fumadocs.
3. **Document** — README/docs reflect v1 feature-complete status; archive completed plans.
4. **Tag** — `v1.0.0-beta` (or `v1.0.0-local`) now; public hosted release becomes `v1.1.0`+.

### Future (v1.1+), not active work

- **Shareable scenario URLs** — deep-link a scenario diff (nice-to-have; not a v1 blocker).
- **Hosted Architecture H1–H7** — adapters, worker, Postgres; before serious public launch.
- **v2 research** — `sroom calibrate`, PPA/EPA work, accounts, DB page-read architecture. **Not started; do not start.**

**Doctrine (unchanged):** JSON under `data/output/api/` is the web contract. DuckDB is local analytics only — do **not** expand it into web page reads. Scenario runs never own `latest.json`. Do **not** build hosted adapters before there is a reason to host. Do **not** re-polish Phase 1.

---

## Key files index (for future agents)

| Concern | Where |
|---------|-------|
| Run generation (Option B) | [`web/lib/runJob.ts`](web/lib/runJob.ts), [`web/app/api/run/`](web/app/api/run/) |
| Run catalog | [`web/lib/runCatalog.ts`](web/lib/runCatalog.ts), [`web/lib/useRunCatalog.ts`](web/lib/useRunCatalog.ts), [`web/app/api/runs/catalog/route.ts`](web/app/api/runs/catalog/route.ts) |
| Run UI / header | [`web/components/layout/RunHeader.tsx`](web/components/layout/RunHeader.tsx), [`web/components/layout/RunAnalysisDialog.tsx`](web/components/layout/RunAnalysisDialog.tsx) |
| Scenario Lab | [`web/components/scenario/`](web/components/scenario/), [`web/lib/scenarioDiff.ts`](web/lib/scenarioDiff.ts), [`web/lib/scenarioWeights.ts`](web/lib/scenarioWeights.ts) |
| Validation dashboard | [`web/components/validation/`](web/components/validation/), [`web/lib/validationFormat.ts`](web/lib/validationFormat.ts), [`web/app/(app)/validation/page.tsx`](web/app/(app)/validation/page.tsx) |
| Validation exporter | [`src/api_contracts/build.py`](src/api_contracts/build.py) (`build_validation_payload`), [`src/validation/reports.py`](src/validation/reports.py), [`tests/test_validation_contract.py`](tests/test_validation_contract.py) |
| JSON API contract | [`src/api_contracts/`](src/api_contracts/), [`docs/api-contracts.md`](docs/api-contracts.md) |
| Dynamic resume explanations | [`src/api_contracts/selection_case.py`](src/api_contracts/selection_case.py) |
| Run identity / scenario stems | [`src/pipeline/paths.py`](src/pipeline/paths.py), [`tests/test_run_identity.py`](tests/test_run_identity.py) |
| DuckDB store (local analytics) | [`src/store/`](src/store/), [`docs/development.md`](docs/development.md) |
| Hosted production architecture | [`docs/architecture/hosted-production.md`](../../docs/architecture/hosted-production.md) |

---

## Bottom line

**Selection Room v1 is a complete local/open-source product.** It is a local
run-capable CFP selection analysis workspace with field/ranking/bracket/bubble
explainability, browser run generation, dynamic team cases, a weight-based
Scenario Lab, a shipped and hardened validation dashboard, and export/share
primitives (rankings CSV, bracket share image, resume card via
`web/components/share/`). Every north-star step — through "Validate" and
"Share / export" — is done.

The next move is **release hardening, not more product scope**: freeze → verify
→ document → tag (`v1.0.0-beta`/`v1.0.0-local`). Shareable scenario URLs and
hosted production (H1–H7) are future work (v1.1+), documented but not active.
