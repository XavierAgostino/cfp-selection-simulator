/**
 * Pure transforms feeding the Committee Tendencies explanatory visuals.
 *
 * These charts EXPLAIN; the tables that sit beside them PROVE. Everything here
 * is presentation-only: no artifact copy, no production weights, no model
 * logic. User-facing labels stay cautious ("Fit approximation", never
 * "Best-fit"). Factor labels intentionally match the codebase convention of
 * dropping the accent on "Resume".
 */
import type { FittedWeights } from "@/lib/types";

export const CHART_FACTOR_ORDER: {
  key: keyof FittedWeights;
  label: string;
}[] = [
  { key: "resume", label: "Resume" },
  { key: "predictive", label: "Predictive" },
  { key: "sor", label: "SOR" },
  { key: "sos", label: "SOS" },
];

function toPct(value: number): number {
  return Math.round(value * 100);
}

// ---------------------------------------------------------------------------
// 2025 final card — paired baseline vs fit-approximation bars
// ---------------------------------------------------------------------------

export interface CompareRow {
  key: keyof FittedWeights;
  label: string;
  /** Raw weights in [0, 1]. */
  baselineValue: number;
  fittedValue: number;
  /** Rounded percentages for display. */
  baselinePct: number;
  fittedPct: number;
  /** Signed integer percentage-point move, fit relative to baseline. */
  deltaPp: number;
  ariaLabel: string;
}

/**
 * One row per factor comparing the Selection Room baseline weight against the
 * fit approximation. The delta is derived from the two displayed percentages so
 * it always reconciles with what the reader sees on the bars.
 */
export function toCompareRows(
  baseline: FittedWeights,
  fitted: FittedWeights,
): CompareRow[] {
  return CHART_FACTOR_ORDER.map(({ key, label }) => {
    const baselineValue = baseline[key];
    const fittedValue = fitted[key];
    const baselinePct = toPct(baselineValue);
    const fittedPct = toPct(fittedValue);
    return {
      key,
      label,
      baselineValue,
      fittedValue,
      baselinePct,
      fittedPct,
      deltaPp: fittedPct - baselinePct,
      ariaLabel: `${label}: baseline ${baselinePct}%, fit approximation ${fittedPct}%`,
    };
  });
}

// ---------------------------------------------------------------------------
// 2024 weekly tracker — per-factor trend sparklines
// ---------------------------------------------------------------------------

export interface TrendInput {
  label: string;
  /** Committee release date, when known. Presentation-only; used by tooltips. */
  date?: string | null;
  weights: FittedWeights;
}

export interface TrendPoint {
  index: number;
  /** Raw weight in [0, 1]. */
  value: number;
  pct: number;
  releaseLabel: string;
}

export interface TrendSeries {
  key: keyof FittedWeights;
  label: string;
  points: TrendPoint[];
  startPct: number;
  endPct: number;
  /** Fit moved up, down, or held flat across the season (integer pp). */
  direction: "up" | "down" | "flat";
  ariaLabel: string;
}

/**
 * One sparkline series per factor across all committee releases. All four
 * series share the fixed [0, 1] domain so the slopes are directly comparable —
 * that shared scale is the whole point of the visual.
 */
export function toTrendSeries(fits: TrendInput[]): TrendSeries[] {
  const firstLabel = fits[0]?.label ?? "start";
  const lastLabel = fits[fits.length - 1]?.label ?? "end";

  return CHART_FACTOR_ORDER.map(({ key, label }) => {
    const points: TrendPoint[] = fits.map((fit, index) => {
      const value = fit.weights[key];
      return { index, value, pct: toPct(value), releaseLabel: fit.label };
    });
    const startPct = points[0]?.pct ?? 0;
    const endPct = points[points.length - 1]?.pct ?? 0;
    const swing = endPct - startPct;
    const direction = swing > 0 ? "up" : swing < 0 ? "down" : "flat";
    return {
      key,
      label,
      points,
      startPct,
      endPct,
      direction,
      ariaLabel: `${label}: ${startPct}% at ${firstLabel}, moving to ${endPct}% at ${lastLabel}`,
    };
  });
}

// ---------------------------------------------------------------------------
// SVG geometry (kept pure so it can be unit-tested without a DOM)
// ---------------------------------------------------------------------------

export interface SparklineGeometry {
  width: number;
  height: number;
  padX: number;
  padY: number;
}

export interface SparklinePoint {
  x: number;
  y: number;
}

/**
 * Map a series onto a fixed [0, 1] vertical domain within the given box. A
 * single point is centered; y grows downward per SVG convention.
 */
export function seriesToPoints(
  series: TrendSeries,
  geo: SparklineGeometry,
): SparklinePoint[] {
  const { width, height, padX, padY } = geo;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const count = series.points.length;

  return series.points.map((point) => {
    const t = count <= 1 ? 0.5 : point.index / (count - 1);
    const x = padX + t * innerW;
    // Domain is fixed [0, 1]; clamp defensively.
    const clamped = Math.max(0, Math.min(1, point.value));
    const y = padY + (1 - clamped) * innerH;
    return { x, y };
  });
}

/** Space-separated "x,y" pairs for an SVG <polyline points={...}>. */
export function pointsToPolyline(points: SparklinePoint[]): string {
  return points
    .map(({ x, y }) => `${round(x)},${round(y)}`)
    .join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
