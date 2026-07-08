"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import {
  CHART_FACTOR_ORDER,
  pointsToPolyline,
  seriesToPoints,
  toTrendSeries,
  type SparklineGeometry,
  type TrendInput,
  type TrendSeries,
} from "@/lib/committeeWeightCharts";
import { cn } from "@/lib/utils";

// Fixed coordinate system; each row's SVG scales to its column via viewBox while
// every series shares one [0,1] vertical domain so slopes stay comparable.
const GEO: SparklineGeometry = { width: 320, height: 44, padX: 10, padY: 8 };

// Grid template shared by every row and the axis. The interaction overlay insets
// are derived from these constants so the guide line and hit columns land
// exactly over the plot column. gap-2 == 0.5rem.
//   plot-left  = label(4) + gap(0.5) + value(2.75) + gap(0.5) = 7.75rem
//   plot-right = value(2.75) + gap(0.5)                        = 3.25rem
const GRID_COLS = "grid grid-cols-[4rem_2.75rem_1fr_2.75rem] items-center gap-2";
const PLOT_LEFT = "7.75rem";
const PLOT_RIGHT = "3.25rem";

function pct(value: number): number {
  return Math.round(value * 100);
}

/** Compact axis tick: "Release 3" -> "R3"; anything else (e.g. "Final") is kept. */
function shortTick(label: string): string {
  const match = /^Release (\d+)$/.exec(label);
  return match ? `R${match[1]}` : label;
}

/** Horizontal position of release `index` as a fraction [0,1] of the plot band. */
function xFraction(index: number, count: number): number {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  return (GEO.padX + t * (GEO.width - 2 * GEO.padX)) / GEO.width;
}

/** Gapless hit boundaries per release: split each gap at the midpoint. */
function hitBounds(count: number): { left: number; right: number }[] {
  const centers = Array.from({ length: count }, (_, i) => xFraction(i, count));
  return centers.map((c, i) => ({
    left: i === 0 ? 0 : (centers[i - 1] + c) / 2,
    right: i === count - 1 ? 1 : (c + centers[i + 1]) / 2,
  }));
}

/**
 * Longhand entrance-animation styles. Longhand (not the `animation` shorthand)
 * because these nodes rerender on every hover, and React warns when a
 * shorthand and a longhand (animationDelay) mix in one style object.
 */
function entranceStyle(durationMs: number): CSSProperties {
  return {
    animationName: "ct-fade-in",
    animationDuration: `${durationMs}ms`,
    animationTimingFunction: "ease-out",
    animationFillMode: "backwards",
  };
}

function releaseAria(fit: TrendInput): string {
  const values = CHART_FACTOR_ORDER.map(
    ({ key, label }) => `${label} ${pct(fit.weights[key])}%`,
  ).join(", ");
  const date = fit.date ? `, ${fit.date}` : "";
  return `${fit.label}${date}: ${values}`;
}

/**
 * Static per-factor sparklines for the 2024 weekly tracker, with lightweight
 * hover / focus / tap inspection. Replaces the wide season-trend table; the
 * selected-release table stays above it and remains the source of exact values.
 *
 * Interaction: the plot band tracks the pointer and snaps to the nearest
 * release, so sweeping across the chart glides point-to-point without ever
 * blinking through an empty state. Keyboard focus and touch taps go through
 * per-release hit buttons. The active release gets a vertical guide, an
 * enlarged point across all four factor rows, and a tooltip listing all four
 * fitted percentages, measured and clamped so it never leaves the card. At
 * rest, the selected release (from the tab above) keeps a neutral ring.
 * Emphasis is gold/neutral only — never a good/bad colour — and the global
 * reduced-motion backstop collapses every animation and transition.
 */
export function CommitteeWeightTrendSparklines({
  fits,
  selectedIndex,
}: {
  fits: TrendInput[];
  selectedIndex?: number;
}) {
  const series = toTrendSeries(fits);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const prevActiveRef = useRef<number | null>(null);
  const count = fits.length;

  // Position the tooltip after render: measure it, center it on the active
  // release, then clamp in px against the full chart width so it can never
  // compress its own text or spill outside the card. Styles are written to
  // the node directly; no state, no extra render.
  useLayoutEffect(() => {
    const tip = tooltipRef.current;
    const band = bandRef.current;
    const container = containerRef.current;
    if (activeIndex === null || !tip || !band || !container) {
      prevActiveRef.current = activeIndex;
      return;
    }
    const bandRect = band.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const width = tip.offsetWidth;
    const center =
      bandRect.left -
      containerRect.left +
      xFraction(activeIndex, count) * bandRect.width;
    const left = Math.max(
      0,
      Math.min(containerRect.width - width, center - width / 2),
    );
    // Slide between releases while visible; appear in place when first shown.
    tip.style.transition =
      prevActiveRef.current === null ? "none" : "transform 160ms ease-out";
    tip.style.transform = `translateX(${left}px)`;
    tip.style.opacity = "1";
    prevActiveRef.current = activeIndex;
  }, [activeIndex, count]);

  if (fits.length < 2) return null;

  const bounds = hitBounds(count);
  const activeFit = activeIndex !== null ? fits[activeIndex] : null;
  const guideX = activeIndex !== null ? xFraction(activeIndex, count) : 0;

  const clearIfActive = (index: number) =>
    setActiveIndex((prev) => (prev === index ? null : prev));

  /** Nearest release to a pointer position, in plot-band coordinates. */
  const nearestIndex = (clientX: number): number | null => {
    const band = bandRef.current;
    if (!band) return null;
    const rect = band.getBoundingClientRect();
    if (rect.width === 0) return null;
    const fraction = (clientX - rect.left) / rect.width;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < count; i += 1) {
      const distance = Math.abs(fraction - xFraction(i, count));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Season trend
        </span>
        <span className="text-[11px] text-muted-foreground">
          Hover or tap a release to inspect the fitted blend
        </span>
      </div>

      <div ref={containerRef} className="relative">
        <div className="overflow-x-auto">
          <div className="min-w-[20rem]">
            <div className="relative flex flex-col gap-2.5">
              {series.map((s, rowIndex) => (
                <SparklineRow
                  key={s.key}
                  series={s}
                  activeIndex={activeIndex}
                  selectedIndex={selectedIndex}
                  delayMs={rowIndex * 90}
                />
              ))}

              {/* Vertical guide at the active release, spanning all four rows. */}
              {activeIndex !== null ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0"
                  style={{ left: PLOT_LEFT, right: PLOT_RIGHT }}
                >
                  <div
                    className="absolute inset-y-0 w-px bg-foreground/30"
                    style={{
                      left: `${guideX * 100}%`,
                      transition: "left 160ms ease-out",
                    }}
                  />
                </div>
              ) : null}

              {/* Hover is tracked on the whole plot band, snapping to the
                  nearest release, so a sweep glides point-to-point and never
                  blinks through an empty state between columns. The buttons
                  remain as keyboard focus stops and touch tap targets. */}
              <div
                ref={bandRef}
                className="absolute inset-y-0"
                style={{ left: PLOT_LEFT, right: PLOT_RIGHT }}
                onPointerMove={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setActiveIndex(nearestIndex(event.clientX));
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setActiveIndex(null);
                }}
              >
                {bounds.map((b, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={releaseAria(fits[i])}
                    aria-pressed={activeIndex === i}
                    onFocus={() => setActiveIndex(i)}
                    onBlur={() => clearIfActive(i)}
                    // Plain set (not toggle): a touch tap fires hover events
                    // before click, so a toggle would cancel itself and the
                    // tooltip would never persist on mobile.
                    onClick={() => setActiveIndex(i)}
                    className="absolute inset-y-0 rounded-sm outline-none focus-visible:bg-foreground/[0.06]"
                    style={{
                      left: `${b.left * 100}%`,
                      width: `${(b.right - b.left) * 100}%`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Release axis, aligned to the point x-coordinates above. */}
            <div className={cn(GRID_COLS, "mt-1")}>
              <span aria-hidden />
              <span aria-hidden />
              <svg
                viewBox={`0 0 ${GEO.width} 12`}
                className="h-auto w-full"
                role="presentation"
              >
                {series[0].points.map((point, index) => {
                  const x = xFraction(index, count) * GEO.width;
                  const isActive = activeIndex === index;
                  return (
                    <text
                      key={point.index}
                      x={x}
                      y={9}
                      textAnchor={
                        index === 0
                          ? "start"
                          : index === count - 1
                            ? "end"
                            : "middle"
                      }
                      className={cn(
                        "text-[9px] tabular-nums",
                        isActive
                          ? "fill-foreground font-semibold"
                          : "fill-muted-foreground",
                      )}
                    >
                      {shortTick(point.releaseLabel)}
                    </text>
                  );
                })}
              </svg>
              <span aria-hidden />
            </div>
          </div>
        </div>

        {/* Tooltip lives outside the scroller so it is never clipped. It
            renders at natural width (w-max) and the layout effect above
            measures and clamps it in px, so its text never compresses or
            escapes the card near the edges. Starts invisible until placed. */}
        {activeFit ? (
          <div
            ref={tooltipRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 w-max opacity-0"
          >
            <div className="-translate-y-[calc(100%+10px)] rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-xs font-semibold text-foreground">
                  {activeFit.label}
                </span>
                {activeFit.date ? (
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {activeFit.date}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-5 gap-y-1">
                {CHART_FACTOR_ORDER.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 whitespace-nowrap"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">
                      {pct(activeFit.weights[key])}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SparklineRow({
  series,
  activeIndex,
  selectedIndex,
  delayMs,
}: {
  series: TrendSeries;
  activeIndex: number | null;
  selectedIndex?: number;
  delayMs: number;
}) {
  const points = seriesToPoints(series, GEO);
  const polyline = pointsToPolyline(points);

  return (
    <div role="img" aria-label={series.ariaLabel} className={GRID_COLS}>
      <span aria-hidden className="text-[13px] font-semibold text-foreground">
        {series.label}
      </span>
      <span
        aria-hidden
        className="text-right text-xs tabular-nums text-muted-foreground"
      >
        {series.startPct}%
      </span>

      <svg
        viewBox={`0 0 ${GEO.width} ${GEO.height}`}
        className="h-auto w-full overflow-visible"
        aria-hidden
      >
        {/* Faint zero-reference baseline. */}
        <line
          x1={GEO.padX}
          y1={GEO.height - GEO.padY}
          x2={GEO.width - GEO.padX}
          y2={GEO.height - GEO.padY}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {/* Entrance is a fade, not a dash-draw: non-scaling-stroke computes
            dash patterns in screen space, which breaks pathLength
            normalisation and truncates the line at some widths. */}
        <polyline
          points={polyline}
          fill="none"
          className="stroke-accent-gold"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ ...entranceStyle(500), animationDelay: `${delayMs}ms` }}
        />
        {points.map((point, index) => {
          const isActive = activeIndex === index;
          const isSelected = activeIndex === null && selectedIndex === index;
          return (
            <PointMarker
              key={index}
              x={point.x}
              y={point.y}
              state={isActive ? "active" : isSelected ? "selected" : "idle"}
              delayMs={delayMs + 500}
            />
          );
        })}
      </svg>

      <span
        aria-hidden
        className="text-right text-xs font-semibold tabular-nums text-foreground"
      >
        {series.endPct}%
      </span>
    </div>
  );
}

function PointMarker({
  x,
  y,
  state,
  delayMs,
}: {
  x: number;
  y: number;
  state: "idle" | "selected" | "active";
  delayMs: number;
}) {
  const active = state === "active";
  const selected = state === "selected";
  // All three layers are always mounted; state changes animate scale/opacity
  // instead of swapping elements, so the active point grows and shrinks
  // smoothly as the pointer sweeps across releases.
  const motion = "opacity 160ms ease-out, transform 160ms ease-out";
  const origin = { transformOrigin: `${x}px ${y}px` } as const;

  return (
    <g style={{ ...entranceStyle(300), animationDelay: `${delayMs}ms` }}>
      {/* Soft halo, revealed only while active. */}
      <circle
        cx={x}
        cy={y}
        r={7}
        className="fill-accent-gold/20"
        style={{
          ...origin,
          opacity: active ? 1 : 0,
          transform: active ? "scale(1)" : "scale(0.4)",
          transition: motion,
        }}
      />
      {/* The dot itself; grows while active. */}
      <circle
        cx={x}
        cy={y}
        r={2.8}
        className="fill-accent-gold stroke-background"
        strokeWidth={active ? 1 : 0}
        style={{
          ...origin,
          transform: active ? "scale(1.6)" : "scale(1)",
          transition: motion,
        }}
      />
      {/* Neutral resting ring for the release selected in the tabs above. */}
      <circle
        cx={x}
        cy={y}
        r={4}
        className="fill-background stroke-foreground"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        style={{ opacity: selected ? 1 : 0, transition: "opacity 160ms ease-out" }}
      />
    </g>
  );
}
