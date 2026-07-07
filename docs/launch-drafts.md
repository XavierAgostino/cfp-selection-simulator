# Launch copy drafts (Phase 7)

Drafts only. Nothing here is posted, and nothing here ships to the site without
review. Numbers below come from `web/lib/fixtures/validation.json` (2014 to 2024,
regenerated 2026-07-07); if the fixture changes, re-check every number before use.

Ground rules baked into every draft:

- Never present model output as win probability or betting guidance.
- Never claim the model "found the committee's formula" or knows its weights.
- Revealed-preferences research stays unmentioned until the Committee Tendencies
  card passes hidden-UI review; the only approved sentence about it is the
  canonical one in `docs/research/revealed-committee-preferences.md`.
- Lead with honesty: the validation page exists to show where the model is wrong.

---

## 1. Landing copy polish (suggestions)

Current positioning is right (transparent, rules-based, validated against
history). Two sharpening suggestions:

**Hero subline candidate:**

> A transparent College Football Playoff selection model. Four published
> factors, no black box, and a validation page that shows you exactly where it
> disagrees with the real committee.

**Proof strip (three stats, linked to /validation):**

> Validated on 11 seasons (2014 to 2024) · Top-12 agreement with the committee:
> 78% average overlap · Field agreement: about 77% of the model's playoff field
> matches the committee's actual field

Avoid on the landing page: "predicts the committee", "accuracy" without a
denominator, and any single-season cherry-pick.

## 2. Reddit draft (r/CFB, text post)

**Title:** I built a fully transparent CFP selection model and validated it
against every committee ranking since 2014. Here is where it agrees and where
it fails.

**Body:**

Selection Room is a rules-based CFP selection simulator: four published factors
(resume, predictive, strength of record, strength of schedule) with fixed
weights, era-correct selection rules (4-team and 12-team), and every step
inspectable. No machine learning, no hidden adjustments.

The part I actually want feedback on is the validation page. I replayed 2014 to
2024 and scored the model against the committee's real final rankings:

- Top-12 rank agreement (Spearman): 0.77 average across 10 seasons with
  committee data, ranging from 0.45 (2019) to 0.97 (2021)
- About 78% average overlap with the committee's top 12
- About 77% of the model's playoff field matches the committee's actual field
- Where it is honestly bad: it has never once matched the committee's "first
  team out", and 2022 (TCU, Kansas State) is a documented outlier season where
  formula agreement collapses

You can run hosted simulations on the site (GitHub sign-in, small daily quota)
or run the whole pipeline yourself; the repo and methodology docs are public.

What I would ask this sub: which disagreements matter? When the model and the
committee split on a bubble team, sometimes the model is missing something real
(injuries, eye test) and sometimes the committee is inconsistent. The
validation page is built to make those arguments concrete instead of vibes.

Link: https://www.selectionroom.org/validation

## 3. LinkedIn draft

Shipping the part of a modeling project nobody ships: the page that shows where
the model is wrong.

Selection Room is a transparent College Football Playoff selection simulator.
Four published factors, fixed weights, era-correct selection rules, and a
validation layer that replays every season since 2014 against the real
committee's final rankings.

The uncomfortable numbers stay on the page: rank agreement swings from 0.45 in
2019 to 0.97 in 2021, the model has never matched the committee's "first team
out", and 2022 is flagged as an outlier season rather than quietly averaged
away. Transparency is only interesting if it survives contact with the cases
where you lose.

Stack: Python pipeline (validation, calibration, research harnesses), Next.js
frontend, hosted runs with per-user quotas. Validation methodology and contracts
are documented in the repo.

https://www.selectionroom.org/validation

## 4. Top 10 expected objections, and what each one changes in the app

1. "The committee does not use a formula, so modeling it is pointless."
   Response: agreed, and the model never claims otherwise; it tests how far a
   transparent formula gets you and shows the residual. App: keep the
   disagreement framing front and center on /validation.
2. "Your weights are arbitrary."
   Response: they are published, fixed, and stress-tested (sensitivity and
   calibration harnesses); changing them is a documented research process, not
   a dial. App: link the methodology doc from the weights display.
3. "0% on first team out means the model fails where it matters most."
   Response: correct, and it is the hardest slice; bubble decisions are where
   committee judgment is least formula-like. App: keep bubble overlap visible;
   revealed-preferences research (not yet public) is aimed exactly here.
4. "2019 Spearman 0.45 is bad. Why trust the average?"
   Response: per-season numbers are all shown; no season is hidden inside the
   mean. App: consider a per-season drill-down link from the summary row.
5. "You are overfitting to the committee by validating against it."
   Response: validation is read-only; production weights never change from
   fit results (that rule is enforced in code and tests). App: state this
   explicitly on /validation.
6. "Why should I care when ESPN already has FPI and the Allstate Playoff
   Predictor?"
   Response: those are predictive and proprietary; this is a selection
   simulator and fully inspectable. App: sharpen this contrast on the landing
   page.
7. "The model cannot see injuries, suspensions, or the eye test."
   Response: by design; it measures what a results-only view concludes, so
   disagreements isolate the judgment component. App: add this to the FAQ.
8. "Small sample: 10 to 11 seasons proves nothing."
   Response: agreed on statistical power; the claim is descriptive agreement,
   not inference. App: keep season counts printed next to every average.
9. "Hosted runs will get gamed or abused."
   Response: GitHub sign-in plus per-user daily quota; browsing is open.
   App: no change needed; document the quota on the run page.
10. "Is this a gambling tool?"
    Response: no; no win probabilities, no odds, no betting language anywhere.
    App: keep that language rule enforced in copy review.

## 5. Committee Tendencies teaser (hold until hidden-UI review passes)

Approved sentence, verbatim, nothing added:

> Under Selection Room's four-factor model, the committee's published top 25
> looks more resume-heavy and less predictive-driven than Selection Room's
> baseline.

Framing when it goes public: research mode, directional confidence only,
badges rendered from the artifact, never a claim about the committee's actual
weights, and never a single-season fitted number quoted as "the committee's
weights".
