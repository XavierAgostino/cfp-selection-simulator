import { TeamChip } from "@/components/team/TeamChip";
import { CommitteeWeightCompareBars } from "@/components/validation/CommitteeWeightCompareBars";
import { WarningBadges } from "@/components/validation/WarningBadges";
import type {
  FittedWeights,
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
  RevealedPublicCase,
} from "@/lib/types";
import { metricLabel } from "@/lib/typography";

const FACTOR_ROWS: { key: keyof FittedWeights; label: string }[] = [
  { key: "resume", label: "Resume" },
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
              <td className="py-1.5 pr-4 font-semibold text-foreground">
                <TeamChip team={team} />
              </td>
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
 * Public Committee Tendencies card. Every sentence and badge is rendered from
 * revealed-preferences.json; nothing is authored here beyond structural section
 * labels. The caller must fail closed: no payload, no card.
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
  const residualTeams = publicCase ? Object.keys(publicCase.fitted_shift) : [];

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

        {/* Desktop: bars explain on the left, the exact table proves on the
            right. Mobile keeps the original stacking order. */}
        <div className="grid gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,13fr)_minmax(0,8fr)] lg:items-start">
          <CommitteeWeightCompareBars baseline={baseline} fitted={fitted} />

          <div className="flex flex-col gap-3">
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
          </div>
        </div>

        {publicCase ? (
          <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Residual case{residualTeams.length > 0 ? ":" : ""}</span>
              {residualTeams.map((team, index) => (
                <span key={team} className="flex items-center gap-x-1.5">
                  {index > 0 ? <span>vs</span> : null}
                  <TeamChip team={team} />
                </span>
              ))}
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
      </div>
    </div>
  );
}
