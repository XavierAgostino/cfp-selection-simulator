---
name: v1 Validation finish + v2 research doc
overview: Finish v1.0 validation vertical slice (data + copy audit), commit Validation MVP, then park post-v1 Committee Emulation and EPA/PPA research in docs/research/v2-tracks-research.md. No v1.5 model work until v1 ships.
status: approved
approved: 2026-07-03
todos:
  - id: v1-validation-data
    content: "Phase A: validation data slice — fixture, aggregation fix, outlier handling, export errors, docs sync, real artifact"
    status: completed
  - id: v1-validation-polish
    content: "Phase B: audit Validation Dashboard copy against real validation.json; tighten agreement labels; optional section verdicts"
    status: completed
  - id: v1-scenario-lab-polish
    content: "Phase B: Scenario Lab empty-state copy if not already done"
    status: completed
  - id: v1-validation-commit
    content: "After Phase A+B: pytest validation tests, tsc, pnpm build, then commit Validation MVP"
    status: completed
  - id: v2-research-doc
    content: "Phase C (after validation ships): docs/research/v2-tracks-research.md — parking note, not roadmap commitment"
    status: completed
  - id: limitations-crosslink
    content: "Phase C: cross-link from limitations-and-ethics.md"
    status: completed
isProject: false
---

# v1 Validation Finish + v2 Research Doc

**Status: APPROVED — FINAL (2026-07-03)**

**Active V1 path only:** finish validation → commit → export/share → v1 release polish. v2 research stays parked in Phase C until validation is committed.

**Decision:** Finish v1 trust layer first. Document v2 research second. Do not start model experiments yet.

**Principle:** The v1 credibility page matters more than a research doc right now. Do not write `v2-tracks-research.md` before validation is complete unless it is literally a short parking note.

---

## North star — product vision (carry into all v2 work)

Selection Room becomes valuable **not because it claims to know the right answer**, but because it makes every assumption **testable, auditable, and comparable**. That is what analysts, media, schools, and committee-adjacent evaluators would care about.

### Category shift

| Today (v1 path) | With research layer (post-v1) |
|---|---|
| Transparent CFP field simulator + Scenario Lab + validation | **Selection intelligence platform** — transparent selection analytics |

**Not:** CFP projection website. **Is:** independent decision platform for college football selection analysis.

**Long-term pitch (use in docs, not marketing fluff):**

> Selection Room is an independent decision platform for college football selection analysis. It lets users inspect the field, audit the selection path, test transparent assumptions, validate model behavior historically, and export reproducible scenarios.

### Questions the platform should answer (analyst workflow)

- Why is Team A ahead of Team B?
- What changes if the committee values SOR more?
- What if predictive strength replaces résumé strength?
- Which model assumptions historically aligned with the committee?
- Which assumptions improved predictive signal?
- Which seasons were true outliers?
- Which teams were most sensitive to methodology?

Every scenario should eventually answer: **What changed? Why? Which teams? Was this assumption historically better? Committee-aligned or predictive? Can I export/share it?**

### Four model layers — keep separate (do not blur)

| Layer | Question |
|---|---|
| **Selection model** | Who deserves / gets selected under published rules? |
| **Predictive model** | How strong are teams on the field? |
| **Validation model** | How did assumptions perform historically? |
| **Scenario model** | What changes if assumptions change? |

Blurring these destroys user trust.

### Three traps to avoid

1. **Black-box oracle** — Bad: "This model knows the correct field." Good: "This platform shows how transparent selection assumptions change the field."
2. **Overfitting to the committee** — Committee Emulation measures alignment under transparent assumptions; it does not optimize for perfect mimicry. Say when the model is committee-aligned, intentionally different, or trades alignment for predictive signal.
3. **Mixing predictive football with selection modeling** — EPA/PPA upgrades football quality signal; it is not a substitute for selection logic or validation tracks.

### Who uses it (and how)

- **Fans / public** — who is in, who is out, why, what changes under alternate assumptions
- **Writers / analysts** — support arguments with reproducible weight scenarios ("Under résumé-heavy, Alabama is in; under predictive-heavy, Miami jumps")
- **Schools / conferences** — profile positioning: SOR vs SOS vs predictive vs résumé; field-status sensitivity
- **Committee-adjacent / serious evaluators** — audit layer: consequences of rule assumptions, historical validation, teams affected by weighting, model vs committee divergence (not outsourced judgment)

### Product version path (do not skip steps)

| Version | Focus |
|---|---|
| **v1** | Trust and usability — field, rules, bubble, Scenario Lab, validation dashboard |
| **v1.5** | Validation shipped, export/share, reproducibility (run IDs, artifacts) |
| **v2** | Research / calibration layer — ablations, Committee Emulation lite, PPA/EPA |
| **v3** | Hosted analyst platform — stable deployment, institutional workflows |

**Active now:** v1 only. v2 research doc parks intent for v2; no implementation until v1.5 export/reproducibility lands.

### v2 research priority (when v1.5 is done — document only until then)

1. **Calibration and ablations** — most important; turns Selection Room into a research tool (remove SOR, shift predictive weight, cap SOS, etc.)
2. **Committee Emulation lite** — historical relationship between transparent assumptions and committee selections
3. **PPA/EPA predictive layer** — biggest football-quality upgrade; CFBD PPA before full PBP
4. **SOR / résumé refinement** — HFA, opponent strength, era-aware treatment (Selection Room-native)
5. **Injuries / VORP / full PBP** — last; data quality, subjective assumptions, maintenance burden

### Institutional-grade checklist (v3 direction, not v1 scope)

Building toward, not claiming today:

1. Full reproducibility
2. Clear data provenance
3. Validation across years
4. No black-box claims
5. Audit logs for every selection step
6. Scenario comparisons
7. Exportable reports
8. Strong disclaimers
9. Stable hosted deployment
10. Confidence / uncertainty labels

Foundation already in place: composite pipeline, manifest/config hash, validation harness, Scenario Lab, audit steps in run output.

---

## Locked execution order

1. Finish Validation data slice (Phase A)
2. Audit Validation copy against real `validation.json` (Phase B)
3. **Commit Validation MVP** (one coherent slice)
4. Write `docs/research/v2-tracks-research.md` (Phase C)
5. Cross-link `limitations-and-ethics.md`
6. Then export/share (bracket PNG, CSV) — out of scope for this plan

---

## Phase A — Validation data slice

Real blocker is **correctness**, not copy. UI/copy largely exists; data slice does not.

### Tasks

1. Review uncommitted validation WIP
2. Add [`web/lib/fixtures/validation.json`](../../web/lib/fixtures/validation.json) so `/validation` works offline
3. Fix predictive headline aggregation → **composite-only** rows (not all models blended)
4. Align outlier-year handling with validation reports or label clearly in UI
5. Stop swallowing validation export errors in [`src/validation/reports.py`](../../src/validation/reports.py); log failures
6. Sync docs:
   - [`docs/web-app.md`](../../docs/web-app.md)
   - [`docs/api-contracts.md`](../../docs/api-contracts.md)
   - [`docs/cli-reference.md`](../../docs/cli-reference.md)
   - [`docs/output-files.md`](../../docs/output-files.md)
7. Fix [`web/content/docs/validation.mdx`](../../web/content/docs/validation.mdx) if it misstates `validation.json` location (repo-level, not per-run)

### Generate real artifact

**Verified CLI syntax** ([`src/cli/main.py`](../../src/cli/main.py)):

```bash
# Primary (default years 2014:2024, all three tracks)
sroom validate --years 2014:2024

# Alternatives documented in repo
./bin/sroom validate --years 2014:2024 --target all
make validate
```

Also exports `data/output/api/validation.json` when export pipeline is wired (see [`src/api_contracts/export.py`](../../src/api_contracts/export.py)).

---

## Phase B — Validation copy audit

Much of VD-5 is **already implemented** in uncommitted WIP. Audit against real numbers, do not rewrite from scratch.

| Requirement | Status | Location |
|---|---|---|
| Scope strip | Done | `ValidationScopeStrip` in [`ValidationDashboard.tsx`](../../web/components/validation/ValidationDashboard.tsx) |
| Era-correct callout | Done | Intro + selection card header |
| Predictive Signal rename | Done | `predictive_signal` term |
| Per-season verdict lines | Done | [`validationFormat.ts`](../../web/lib/validationFormat.ts) |
| Footer metadata | Done | `ValidationArtifactFooter` |
| Field accuracy scope | Done | `fieldAccuracyHeadlineLabel`, `fieldAccuracyScopeSub` |

### Audit checklist

- Verify 2024 (11/12), 2020 (1/4), 2022 outlier read honestly against live artifact
- Tighten `agreementLabel` in [`validationFormat.ts`](../../web/lib/validationFormat.ts): "very close" at ≥0.9 overstates 0.75–0.85 doctrine
- Add **section-level summary verdicts** only if per-row lines lack at-a-glance interpretation
- Scenario Lab empty panel copy per [`vision_status_cleanup.plan.md`](vision_status_cleanup.plan.md) if not done

### Section-level verdict templates (optional, fill from live data)

**Committee alignment:**
> "Across {N} seasons, the model's top-12 ordering correlates {spearman} with the committee (mean overlap {pct}). Disagreements cluster on bubble teams and outlier years like 2022."

**Era-correct field:**
> "Under each season's actual playoff rules, the model matched {mean_overlap} of field participants on average ({correct_rate} seasons with correct field size)."

**Predictive signal:**
> "On completed games, the composite beats simpler baselines on win-side accuracy in {X} of {N} seasons. Retrospective scoring only, not spread-beating or live forecasting."

### Commit

After Phase A+B pass:

1. Run validation tests: `pytest tests/test_validation_contract.py` and any validation/report tests
2. Run `tsc` + `pnpm build`
3. Commit Validation MVP as one coherent slice

---

## Phase C — v2 research doc (after validation ships)

**Purpose:** Park post-v1 research. **Not** a roadmap commitment.

**File:** [`docs/research/v2-tracks-research.md`](../../docs/research/v2-tracks-research.md)

**Terminology:** Use **Committee Emulation** and **EPA/PPA layer** — not "Track 1/2" (those names belong to validation tracks).

### Required structure (Phase C doc must include product vision above)

0. **Product intent** — north star, four model layers, three traps, long-term pitch (condensed from this plan)
1. **What v1 already does** — SOR 20%, 40/30/20/10 composite, three-track validation, Scenario Lab weights-only
2. **What limitations remain** — injuries, recency, CFP 2025 record strength parity, no PBP
3. **Candidate improvements** — ordered: calibration/ablations → Committee Emulation lite → PPA/EPA → SOR refinement → injuries/PBP last
4. **Why not now** — v1 trust layer first; v1.5 export/reproducibility before v2 experiments
5. **Experiment protocol** — tied to `sroom validate` + future `sroom calibrate`; holdout years 2022, 2024
6. **Go/no-go criteria** — marginal field overlap / Brier improvement; must state committee-aligned vs predictive vs intentional divergence
7. **Deferred implementation checklist** — explicit do-not-start list
8. **Analyst workflow questions** — what changed, why, which teams, exportable artifacts

### Corrections to include (from research assessment)

| Assumed gap | Repo reality |
|---|---|
| Build SOR for v1.5 | Already shipped — Poisson-binomial at 20% |
| Target 0.90 Spearman | Unrealistic — cap at 0.75–0.85 |
| 65% predictive target | Needs metric clarification — win-side accuracy is not ATS; ATS edges are much smaller and should not be conflated with retrospective win-side scoring |
| Recency decay = committee win | May conflict with CFP stated behavior; Elo already chronological |
| Full PBP DuckDB for EPA | Premature — CFBD `/ppa/teams`, `/ppa/games` first |

### Committee Emulation guardrail (product identity)

**Do not** frame the goal as "copy the committee perfectly."

**Do** frame it as: *measure which transparent assumptions increase or decrease alignment with historical committee behavior.*

This preserves Selection Room as an unbiased audit tool, not a committee replica.

### Cross-link

Add "researched, deferred" section to [`docs/research/limitations-and-ethics.md`](../../docs/research/limitations-and-ethics.md) pointing to `v2-tracks-research.md`.

---

## Explicitly deferred — do not start

- `sroom calibrate` implementation
- Recency decay
- Injury feed / VORP multiplier
- PBP DuckDB schema
- Hosted adapters H1–H7
- Export/share (bracket PNG, CSV, share URLs)

Post-v1 research sequence (document only — matches product priority, do not build until go/no-go):

1. **Calibration and ablations** — `sroom calibrate`; weight/component removal experiments
2. **Committee Emulation lite** — measure alignment under transparent assumptions (not mimicry)
3. **CFBD PPA / EPA predictive layer** — before full PBP
4. **SOR / résumé refinement** — HFA, era-aware treatment
5. Go/no-go gate before injury feed or full PBP

---

## Agent execution prompt (paste verbatim)

> Proceed with v1 Validation finish first.
>
> **Phase A:**
> - Review validation WIP.
> - Add `web/lib/fixtures/validation.json`.
> - Fix predictive headline aggregation to composite-only rows.
> - Align outlier-year handling with validation reports or label clearly.
> - Stop swallowing validation export errors. Log failures.
> - Sync docs: `docs/web-app.md`, `docs/api-contracts.md`, `docs/cli-reference.md`, `docs/output-files.md`.
> - Fix `web/content/docs/validation.mdx` if it misstates `validation.json` location.
> - Generate a real validation artifact: `sroom validate --years 2014:2024` (or `./bin/sroom validate`, or `make validate`).
> - Run relevant validation tests, especially `tests/test_validation_contract.py`.
>
> **Phase B:**
> - Audit Validation Dashboard copy against real `validation.json`.
> - Confirm `/validation` renders from seeded fixture and from real `validation.json`.
> - Verify 2024, 2020, and 2022 read honestly.
> - Ensure agreement labels do not overstate historical committee alignment.
> - Add section-level verdicts only if the page still lacks at-a-glance interpretation.
> - Polish Scenario Lab empty state copy if not already done.
> - Run `pytest tests/test_validation_contract.py` and any validation/report tests, then `tsc` + `pnpm build`. Commit Validation MVP.
>
> **Phase C (after validation ships):**
> - Add `docs/research/v2-tracks-research.md` — parking note, not roadmap.
> - Cross-link from `limitations-and-ethics.md`.
>
> **Do not start:** calibrate, recency decay, injury feed, PBP schema, hosted adapters, export/share.

---

## Bottom line

Protect the roadmap: see the next research frontier, but do not let it interrupt v1.

**Path to analyst-grade platform:** finish validation → commit → export/share (v1.5) → park/build research/calibration (v2) → hosted analyst workflows (v3).

Value comes from testable assumptions, not oracle claims.
