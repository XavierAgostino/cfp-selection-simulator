Here’s the “make it industry-grade” spec you can hand straight to Claude for this repo.

---

# Industry Upgrade Plan – `cfp-selection-simulator`

**Goal:** Turn this from an academic-style simulator into an **industry-grade analytics service** that:

1. Has **hard numbers** proving it beats strong baselines.
2. Runs as a **proper Python package + CLI**, not just notebooks.
3. Is covered by **tests, CI, and automated backtesting**.
4. Can be wired into an **API or dashboard** with minimal extra work.

The current repo already has a strong architecture, Docker, CI, and a full 00-08 notebook flow with resume vs predictive split and 12-team 5+7 logic.  Keep that; upgrade it per the stages below.

---

## Stage 1 – Hard modeling & validation

### 1.1 Solidify evaluation targets

Use the existing evaluation section as the contract:

* Spearman correlation > 0.85
* Selection accuracy > 90%
* Seeding accuracy > 75% 

Extend with **margin and probability** metrics:

* Mean Absolute Error (MAE) on point spread
* Root Mean Squared Error (RMSE)
* Brier score and/or log loss for win probabilities
* Calibration (reliability) curves for win probabilities

### 1.2 Build a true backtesting harness (code, not just notebook)

1. Create `src/validation/backtest.py` with functions like:

   ```python
   def run_season_backtest(year: int, max_week: int | None = None) -> dict:
       """
       Train models using games up to `max_week` and evaluate
       end-of-regular-season rankings vs:
         - Official CFP teams/seeds
         - Baseline models (Elo, simple SRS, etc.)
       Returns a dict of metrics.
       """
   ```

2. Use the data pipeline and ranking modules already defined in the 00–08 flow. 

3. For each season 2014–2023:

   * Run the full pipeline up through composite rankings.
   * Compare final rankings and bracket to the historical CFP field.
   * Compute:

     * Selection accuracy (correct playoff teams)
     * Seeding accuracy (correct positions / within ±1)
     * Spearman correlation with committee rankings
     * MAE/RMSE vs actual game margins in that season

4. Store results in `data/output/validation/` as CSV/JSON summary tables (per season + overall).

5. Wire `08_validation_backtesting.ipynb` to **only orchestrate** calls to `src/validation/backtest.py` and plot the results (no heavy logic in the notebook).

---

## Stage 2 – Benchmark vs baselines

### 2.1 Implement baseline models in code

In `src/rankings/`:

1. Add `baseline.py` with:

   * `home_field_baseline` (home team by fixed 3–4 points).
   * Simple **Elo** (already conceptually in repo; formalize as a standalone baseline implementation). 
   * Simple **SRS** (average margin adjusted for opponent strength) if time permits.

2. During backtesting, always compute predictions from:

   * Your full **composite model**. 
   * At least one naive baseline (home team +3).
   * Elo/SRS baseline.

### 2.2 Produce comparison tables and charts

In `08_validation_backtesting.ipynb`:

* For each model: composite, Elo, SRS, naive

  * Compute MAE, RMSE, Brier score, Spearman, selection/seeding metrics.

* Display a table like:

  ```text
  model        mae   rmse   brier   spearman   sel_acc   seed_acc
  composite    ...   ...    ...     ...        ...       ...
  elo          ...   ...    ...     ...        ...       ...
  naive_home3  ...   ...    ...     ...        ...       ...
  ```

* Plot year-by-year performance to show stability, not just one good season.

This is what makes the project feel “industry-proofed.”

---

## Stage 3 – Package + CLI (turn it into a library/tool)

Right now the README already hints at a future CLI and package.  Turn that into reality.

### 3.1 Python package

1. Add `pyproject.toml` (or `setup.cfg`) so the project can be installed as `cfp-selection-simulator`. Follow the existing roadmap item “Complete Python package (installable via pip)”. 

2. Restructure `src/` into a clear package, e.g.:

   ```text
   src/cfp_sim/
       __init__.py
       config.py
       data/fetcher.py
       rankings/colley.py
       rankings/massey.py
       rankings/elo.py
       rankings/sor.py
       rankings/composite.py
       resume/team_sheets.py
       playoff/bracket.py
       validation/backtest.py
       viz/plots.py
   ```

3. Make notebooks import from `cfp_sim.*` instead of ad-hoc relative imports.

### 3.2 CLI implementation

Using `typer` or `click`, create `src/cfp_sim/cli.py` with commands promised in the README: 

* `cfp-simulator run --year 2025 --week 15`

  * Run the full pipeline: fetch data → rankings → resume sheets → bracket → visualizations → exports.

* `cfp-simulator rank --year 2025 --week 15`

  * Only compute rankings and resume team sheets; write to `data/output/rankings/` and `exports/`. 

* `cfp-simulator bracket --year 2025 --week 15`

  * Use existing composite rankings to build bracket + selection audit file. 

* `cfp-simulator validate --year 2023`

  * Run historical backtest for a given year or range of years and print metrics.

Expose the CLI entry point in `pyproject.toml`:

```toml
[project.scripts]
cfp-simulator = "cfp_sim.cli:app"
```

---

## Stage 4 – Testing & CI hardening

The roadmap already calls for **expanded test coverage (>80%)**. 

### 4.1 Unit tests

In `tests/` add tests for:

* `data.fetcher`: FBS filtering, cache behavior using small stub data.
* `rankings.colley`, `.massey`, `.elo`, `.sor`:

  * Known toy examples where the correct rankings are known.
* `resume.team_sheets`:

  * Quality wins, bad losses, SOS/SOR ranks for a small synthetic season.
* `playoff.bracket`:

  * 5+7 auto-bid logic, tie-breakers, champ-pulled-in scenario.
* `validation.backtest`:

  * For a synthetic mini-season, ensure metrics are computed correctly.

### 4.2 CI

* Update `.github/workflows/ci.yml` so it runs on push/PR:

  * `pytest`
  * coverage report; fail if coverage < 80%
  * `black`, `flake8`, `mypy` (if type hints are present)

This makes your green check in the README actually meaningful. 

---

## Stage 5 – Automation & weekly updates

You already list “Automated weekly updates” on the roadmap. 

1. Add a scheduled GitHub Actions workflow (e.g., `weekly_run.yml`) that:

   * Runs each Monday during the season.

   * Uses the CLI to run:

     ```bash
     cfp-simulator run --year $CURRENT_YEAR --week $CURRENT_WEEK
     ```

   * Publishes updated:

     * `composite_rankings_{year}_week{week}.csv`
     * `playoff_bracket_{year}_week{week}.html/json`
     * Visualizations (`prediction_errors`, `ranking_stability`, etc.) to `data/output/visualizations/`. 

2. (Optional for portfolio) Configure GitHub Pages or S3/CloudFront to serve the visualizations and bracket HTML.

---

## Stage 6 – API & dashboard (light productization)

This is more “portfolio wow” than requirement, but it moves it even closer to real-world:

1. Create a minimal **FastAPI** app `src/cfp_sim/api.py`:

   * `GET /rankings?year=2025&week=15` → return composite rankings JSON.
   * `GET /bracket?year=2025&week=15` → return 12-team bracket JSON.
   * `GET /team/{team_id}?year=2025&week=15` → return that team’s resume sheet row.

2. Optionally add a simple **Streamlit** or Dash dashboard that:

   * Lets users pick year/week.
   * Shows Top 25 table, resume vs predictive scatter, bracket graphic, and prediction error histograms.

You don’t need to deploy this forever; having the code + screenshot is enough for “industry-go” vibes.

---

## Stage 7 – Documentation & model card

You already have good documentation and a roadmap.  Upgrade it with:

1. `docs/MODEL_CARD.md`:

   * Data source & limitations (CFBD API). 
   * Algorithms (Colley, Massey, Elo, SOR, win% and their weights). 
   * Preprocessing (FBS filtering, MOV cap 28, HFA 3.75, weeks 0–4 exclusion). 
   * Evaluation metrics and historical results (from Stage 1 & 2).
   * Known failure modes (injuries, QB changes, weird bowl opt-outs, etc.).
   * Ethical note / disclaimer (already in README – reference it). 

2. Update `docs/README.md` to include:

   * Architecture diagram of the data flow: API → cache → rankings → resume → bracket → viz. 
   * Short instructions for:

     * “Run full season for a given week with CLI”
     * “Run historical validation”
     * “Embed in your own Python workflows via the Python API.” 

---

## Stage 8 – “Industry-ready” checklist

Claude should treat the project as **industry-grade** once all of this is true:

* [ ] Package installable with `pip install -e .` and a clear `cfp-simulator` CLI. 
* [ ] Backtesting harness runs over 2014–2023 and produces saved metrics tables. 
* [ ] Composite model **outperforms at least one strong baseline** (Elo/SRS) on MAE/Brier/Spearman in those seasons.
* [ ] Selection accuracy ≥ target; seeding accuracy ≥ target (or you at least report and discuss the gap). 
* [ ] Test coverage ≥ 80% and CI passes for all pushes/PRs. 
* [ ] Weekly scheduled run updates outputs during the season.
* [ ] Minimal FastAPI endpoints and/or dashboard can be spun up locally via Docker. 
* [ ] `docs/MODEL_CARD.md` exists and summarizes data, methods, metrics, and limitations.

---

If you paste this into Claude as “You are a coding agent inside this repo; follow this plan,” it has everything needed to push the project from *very strong academic* to something you can straight-up call **industry-grade analytics** in interviews.
