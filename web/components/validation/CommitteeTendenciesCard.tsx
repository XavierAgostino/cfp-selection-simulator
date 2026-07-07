import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  FittedWeights,
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
  RevealedPublicCase,
} from "@/lib/types";
import { metricLabel } from "@/lib/typography";

const FACTOR_ROWS: { key: keyof FittedWeights; label: string }[] = [
  { key: "resume", label: "Résumé" },
  { key: "predictive", label: "Predictive" },
  { key: "sor", label: "SOR" },
  { key: "sos", label: "SOS" },
];

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedPp(value: number | undefined): string {
  if (value === undefined) return "—";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value}pp`;
}

/** Badge pill; explainer copy comes from the artifact's badge_explainers. */
function WarningBadges({
  badges,
  explainers,
}: {
  badges: string[];
  explainers: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge}
          title={explainers[badge]}
          className={`rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ${
            explainers[badge] ? "cursor-help" : ""
          }`}
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

/** Short disclaimer stays visible; the full caveat stack collapses. */
function MethodologyNotes({
  disclaimerShort,
  caveats,
}: {
  disclaimerShort: string;
  caveats: string[];
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {disclaimerShort}
      </p>
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDown
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-180"
          />
          Methodology notes
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1 pt-2">
            {caveats.map((caveat) => (
              <p
                key={caveat}
                className="max-w-3xl text-xs leading-relaxed text-muted-foreground"
              >
                {caveat}
              </p>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ResidualTable({ publicCase }: { publicCase: RevealedPublicCase }) {
  const rows = Object.entries(publicCase.fitted_shift);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-md text-sm tabular-nums">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-1.5 pr-4 font-medium">Team</th>
            <th className="py-1.5 pr-4 font-medium">Committee</th>
            <th className="py-1.5 pr-4 font-medium">Baseline</th>
            <th className="py-1.5 font-medium">Fitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([team, ranks]) => (
            <tr key={team} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pr-4 font-semibold text-foreground">{team}</td>
              <td className="py-1.5 pr-4">{ranks.committee_rank ?? "—"}</td>
              <td className="py-1.5 pr-4">{ranks.baseline_rank}</td>
              <td className="py-1.5">{ranks.fitted_rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Hidden research card (debug=revealed only). Every sentence and badge is
 * rendered from revealed-preferences.json; nothing is authored here beyond
 * structural section labels. The caller must fail closed: no payload, no card.
 */
export function CommitteeTendenciesCard({
  payload,
  entry,
}: {
  payload: RevealedPreferencesPayload;
  entry: RevealedPreferencesEntry;
}) {
  const baseline = payload.production_baseline;
  const fitted = entry.fitted_weights;
  const productionDelta = entry.baseline_delta_pp?.production ?? null;
  const publicCase = payload.public_case_2025;
  const residualTeams = publicCase
    ? Object.keys(publicCase.fitted_shift).join(" vs ")
    : null;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className={metricLabel}>
            Committee Tendencies: {entry.year} Final Ranking
          </span>
          <WarningBadges
            badges={entry.warning_badges}
            explainers={payload.badge_explainers}
          />
        </div>

        <p className="max-w-3xl text-sm leading-[1.85] text-foreground sm:text-[15px]">
          {payload.disclaimer}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full max-w-md text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4 font-medium">Factor</th>
                <th className="py-1.5 pr-4 font-medium">Baseline</th>
                <th className="py-1.5 pr-4 font-medium">Best-fit approximation</th>
                <th className="py-1.5 font-medium">Shift</th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-4 font-semibold text-foreground">{label}</td>
                  <td className="py-1.5 pr-4">{pct(baseline[key])}</td>
                  <td className="py-1.5 pr-4">{pct(fitted[key])}</td>
                  <td className="py-1.5">{signedPp(productionDelta?.[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key takeaway
          </span>
          <p className="max-w-3xl text-sm leading-relaxed text-foreground">
            {entry.interpretation.headline}
          </p>
        </div>

        {publicCase ? (
          <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Residual case{residualTeams ? `: ${residualTeams}` : ""}
            </span>
            <span className="text-xs text-muted-foreground">
              {publicCase.committee_order}
            </span>
            <ResidualTable publicCase={publicCase} />
            {!publicCase.reproduces_committee_order ? (
              <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                {publicCase.explanation}
              </p>
            ) : null}
          </div>
        ) : null}

        <MethodologyNotes
          disclaimerShort={payload.disclaimer_short}
          caveats={payload.caveats}
        />
      </div>
    </div>
  );
}
