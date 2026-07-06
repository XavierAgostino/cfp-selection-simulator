/**
 * Scenario weight helpers — the TypeScript mirror of `src/pipeline/weights.py`
 * and `weights_scenario_id` in `src/pipeline/paths.py`.
 *
 * The four composite weights (resume/predictive/sor/sos) sum to 1.0. A scenario
 * id is derived deterministically from whole-percent values so the same weights
 * always map to the same run stem — `w45-25-20-10` — and default weights collapse
 * to the base run. Keep this in lockstep with the Python side.
 */

export interface ScenarioWeights {
  resume: number;
  predictive: number;
  sor: number;
  sos: number;
}

export const WEIGHT_KEYS = ["resume", "predictive", "sor", "sos"] as const;

/** Engine defaults — must match `RankingWeights` in `src/pipeline/weights.py`. */
export const DEFAULT_WEIGHTS: ScenarioWeights = {
  resume: 0.4,
  predictive: 0.3,
  sor: 0.2,
  sos: 0.1,
};

export const BASE_SCENARIO_ID = "base";

/** Round a 0–1 weight to a whole percent (0–100). */
export function toPercent(weight: number): number {
  return Math.round(weight * 100);
}

/** True when weights equal the engine defaults (within rounding). */
export function weightsMatchBase(weights: ScenarioWeights): boolean {
  return WEIGHT_KEYS.every(
    (key) => toPercent(weights[key]) === toPercent(DEFAULT_WEIGHTS[key]),
  );
}

/**
 * Derive the scenario id, e.g. `w45-25-20-10`. Default weights collapse to
 * `base`, matching `weights_scenario_id` in Python.
 */
export function weightsScenarioId(weights: ScenarioWeights): string {
  if (weightsMatchBase(weights)) return BASE_SCENARIO_ID;
  return "w" + WEIGHT_KEYS.map((key) => toPercent(weights[key])).join("-");
}

/** Format for the CLI `--weights` flag: `resume=0.45,predictive=0.25,...`. */
export function formatWeightSpec(weights: ScenarioWeights): string {
  return WEIGHT_KEYS.map((key) => `${key}=${weights[key]}`).join(",");
}

// ---------------------------------------------------------------------------
// Whole-percent helpers — the Scenario Lab sliders work in integers that sum to
// exactly 100, then convert to 0–1 fractions for the engine.
// ---------------------------------------------------------------------------

export type WeightPercents = Record<(typeof WEIGHT_KEYS)[number], number>;

export const DEFAULT_PERCENTS: WeightPercents = {
  resume: 40,
  predictive: 30,
  sor: 20,
  sos: 10,
};

export function percentsToWeights(percents: WeightPercents): ScenarioWeights {
  return {
    resume: percents.resume / 100,
    predictive: percents.predictive / 100,
    sor: percents.sor / 100,
    sos: percents.sos / 100,
  };
}

export function percentsMatchBase(percents: WeightPercents): boolean {
  return WEIGHT_KEYS.every((key) => percents[key] === DEFAULT_PERCENTS[key]);
}

// ---------------------------------------------------------------------------
// Scenario presets — named starting points for the sliders. Each is a
// hypothesis about what the committee values, not a probability claim.
// ---------------------------------------------------------------------------

export interface ScenarioPreset {
  id: string;
  label: string;
  /** One plain sentence: whose worldview this weighting represents. */
  description: string;
  percents: WeightPercents;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "committee-like",
    label: "Committee-like",
    description:
      "The calibrated base weights: the blend that best reproduced the committee's picks across 2014-2024.",
    percents: { ...DEFAULT_PERCENTS },
  },
  {
    id: "resume-heavy",
    label: "Resume-heavy",
    description:
      "Rewards what teams earned on the field: wins, losses, and quality results dominate the composite.",
    percents: { resume: 55, predictive: 20, sor: 15, sos: 10 },
  },
  {
    id: "predictive-heavy",
    label: "Best-team",
    description:
      "Rewards underlying team strength: pick the twelve best teams even when their records lag.",
    percents: { resume: 20, predictive: 55, sor: 15, sos: 10 },
  },
  {
    id: "sor-heavy",
    label: "SOR-heavy",
    description:
      "Rewards records in schedule context: who achieved the most given the slate they actually played.",
    percents: { resume: 25, predictive: 20, sor: 45, sos: 10 },
  },
  {
    id: "equal",
    label: "Equal weights",
    description:
      "No opinion: all four components count the same, a neutral reference point for the other presets.",
    percents: { resume: 25, predictive: 25, sor: 25, sos: 25 },
  },
];

/** The preset whose percents exactly match `percents`, if any. */
export function matchingPreset(percents: WeightPercents): ScenarioPreset | null {
  return (
    SCENARIO_PRESETS.find((preset) =>
      WEIGHT_KEYS.every((key) => preset.percents[key] === percents[key]),
    ) ?? null
  );
}

/**
 * Move one slider to `rawValue` and rebalance the other three so the four still
 * sum to exactly 100. The remainder is split proportionally to the others'
 * current shares (equally when they're all zero), with leftover integer points
 * assigned by largest fractional part so the total never drifts off 100.
 */
export function redistributePercents(
  current: WeightPercents,
  key: (typeof WEIGHT_KEYS)[number],
  rawValue: number,
): WeightPercents {
  const value = Math.max(0, Math.min(100, Math.round(rawValue)));
  const others = WEIGHT_KEYS.filter((k) => k !== key);
  const remaining = 100 - value;
  const othersTotal = others.reduce((sum, k) => sum + current[k], 0);

  const next = { ...current, [key]: value } as WeightPercents;

  if (othersTotal === 0) {
    const each = Math.floor(remaining / others.length);
    others.forEach((k) => (next[k] = each));
    next[others[0]] += remaining - each * others.length;
    return next;
  }

  const exact = others.map((k) => ({
    key: k,
    value: (remaining * current[k]) / othersTotal,
  }));
  let allocated = 0;
  for (const entry of exact) {
    next[entry.key] = Math.floor(entry.value);
    allocated += next[entry.key];
  }
  const leftover = remaining - allocated;
  exact
    .sort((a, b) => (b.value % 1) - (a.value % 1))
    .slice(0, leftover)
    .forEach((entry) => (next[entry.key] += 1));
  return next;
}

/**
 * Validate an untrusted weights object: four finite numbers in [0, 1] summing
 * to ~1.0. Returns a normalized `ScenarioWeights` or null.
 */
export function parseScenarioWeights(value: unknown): ScenarioWeights | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const out = {} as ScenarioWeights;
  let sum = 0;
  for (const key of WEIGHT_KEYS) {
    const raw = record[key];
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) {
      return null;
    }
    out[key] = raw;
    sum += raw;
  }
  if (Math.abs(sum - 1) > 0.01) return null;
  return out;
}
