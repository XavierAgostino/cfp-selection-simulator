"use client";

import { useState } from "react";

import type {
  FittedWeights,
  RevealedWeeklyFit,
  RevealedWeeklyPayload,
  RevealedWeeklySeason,
} from "@/lib/types";
import { metricLabel } from "@/lib/typography";

const FACTOR_ROWS: { key: keyof FittedWeights; label: string }[] = [
  { key: "resume", label: "Résumé" },
  { key: "predictive", label: "Predictive" },
  { key: "sor", label: "SOR" },
  { key: "sos", label: "SOS" },
];

const FINAL_CFP_RANKING_WEEK = 15;

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedPp(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value}pp`;
}

function releaseLabel(fit: RevealedWeeklyFit): string {
  if (fit.games_through_week === FINAL_CFP_RANKING_WEEK) return "Final";
  if (fit.ranking_release !== null) return `Release ${fit.ranking_release}`;
  return `Through wk ${fit.games_through_week}`;
}

/**
 * Hidden research tracker (debug=revealed only). Selector is by committee
 * release identity, never raw game week. Every sentence and badge comes from
 * revealed-preferences-weekly.json; only structural labels live here. The
 * caller must fail closed: no payload, no tracker.
 */
export function CommitteeTendenciesWeeklyTracker({
  payload,
  season,
}: {
  payload: RevealedWeeklyPayload;
  season: RevealedWeeklySeason;
}) {
  const fits = season.weekly_fits;
  const [selectedIndex, setSelectedIndex] = useState(fits.length - 1);
  const fit = fits[selectedIndex];
  const baseline = payload.production_baseline;
  const productionDelta = fit.baseline_delta_pp?.production ?? null;
  const volatility = season.volatility;

  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={metricLabel}>
            Committee Tendencies &mdash; {season.season} Weekly Tracker
          </span>
          <div className="flex flex-wrap gap-1.5">
            {fit.warning_badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-[1.85] text-foreground sm:text-[15px]">
          {payload.disclaimer}
        </p>

        <div className="flex flex-wrap gap-1.5" role="tablist">
          {fits.map((candidate, index) => (
            <button
              key={candidate.games_through_week}
              type="button"
              role="tab"
              aria-selected={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                index === selectedIndex
                  ? "border-foreground/40 bg-secondary text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <span>{releaseLabel(candidate)}</span>
              {candidate.release_date ? (
                <span className="ml-1.5 font-normal opacity-70">
                  {candidate.release_date}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full max-w-lg text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Factor</th>
                <th className="py-1.5 pr-4 font-medium">Baseline</th>
                <th className="py-1.5 pr-4 font-medium">Committee-fit approximation</th>
                <th className="py-1.5 pr-4 font-medium">Shift</th>
                <th className="py-1.5 font-medium">vs prior release</th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-4 font-semibold text-foreground">{label}</td>
                  <td className="py-1.5 pr-4">{pct(baseline[key])}</td>
                  <td className="py-1.5 pr-4">{pct(fit.fitted_weights[key])}</td>
                  <td className="py-1.5 pr-4">{signedPp(productionDelta?.[key])}</td>
                  <td className="py-1.5">
                    {signedPp(fit.prior_release_delta_pp?.[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full max-w-lg text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Trend</th>
                {fits.map((candidate) => (
                  <th
                    key={candidate.games_through_week}
                    className="py-1.5 pr-4 font-medium"
                  >
                    {releaseLabel(candidate)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTOR_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-4 font-semibold text-foreground">{label}</td>
                  {fits.map((candidate) => (
                    <td
                      key={candidate.games_through_week}
                      className="py-1.5 pr-4"
                    >
                      {pct(candidate.fitted_weights[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {volatility.volatility_note ? (
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {volatility.volatility_note}
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          {payload.caveats.map((caveat) => (
            <p
              key={caveat}
              className="max-w-3xl text-xs leading-relaxed text-muted-foreground"
            >
              {caveat}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
