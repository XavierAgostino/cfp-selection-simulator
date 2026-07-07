"use client";

import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { InfoTooltip } from "@/components/explain/InfoTooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import {
  classifyDisagreements,
  MISS_KIND_DEFINITIONS,
  type MissTaxonomy,
} from "@/lib/committeeInsights";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type {
  CommitteeAgreement,
  CommitteeComparisonPayload,
  CommitteeComparisonTeam,
} from "@/lib/types";
import { metricLabel, metricValueLg, teamName } from "@/lib/typography";
import { cn } from "@/lib/utils";

const AGREEMENT_CHIP: Record<
  CommitteeAgreement,
  { label: string; variant: "chip-green" | "chip-gold" | "chip-red" } | null
> = {
  both_in: { label: "In both fields", variant: "chip-green" },
  model_only: { label: "Model only", variant: "chip-gold" },
  committee_only: { label: "Committee only", variant: "chip-red" },
  both_out: null,
};

function AgreementChip({ agreement }: { agreement: CommitteeAgreement }) {
  const chip = AGREEMENT_CHIP[agreement];
  if (!chip) {
    return <span className="text-xs text-muted-foreground">Out in both</span>;
  }
  return <Badge variant={chip.variant}>{chip.label}</Badge>;
}

/** Signed rank shift; positive = the model ranks the team higher than the committee. */
function RankShift({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (delta === 0) {
    return (
      <span className="text-xs tabular-nums text-muted-foreground" title="Same rank">
        =
      </span>
    );
  }
  const higher = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        higher ? "text-tag-gold-text" : "text-muted-foreground",
      )}
      title={
        higher
          ? `The model ranks this team ${delta} spot${delta === 1 ? "" : "s"} higher than the committee`
          : `The model ranks this team ${-delta} spot${delta === -1 ? "" : "s"} lower than the committee`
      }
    >
      {higher ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : (
        <ArrowDown className="size-3" aria-hidden />
      )}
      {Math.abs(delta)}
    </span>
  );
}

function TeamCell({ row }: { row: CommitteeComparisonTeam }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(row.team)}
      aria-label={`Open resume for ${row.team}`}
      className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors duration-150 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <TeamLogoTile
        team={row.team}
        logoUrl={row.logo_url}
        abbreviation={row.abbreviation}
        primaryColor={row.primary_color}
        size={20}
      />
      <span className={cn("min-w-0 flex-1", teamName)}>{row.team}</span>
    </button>
  );
}

function DisagreementChip({ row }: { row: CommitteeComparisonTeam }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(row.team)}
      aria-label={`Open resume for ${row.team}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <TeamLogoTile
        team={row.team}
        logoUrl={row.logo_url}
        abbreviation={row.abbreviation}
        primaryColor={row.primary_color}
        size={16}
      />
      {row.team}
    </button>
  );
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
      <div className={metricLabel}>{label}</div>
      <div className={cn(metricValueLg, "mt-1")}>{value}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

/**
 * What kind of disagreement each difference is. Naming the kind is the point:
 * "bubble swap" and "auto-bid displacement" are different claims about the
 * model, and a reviewer should not have to infer which one happened.
 */
function DisagreementTaxonomy({ taxonomy }: { taxonomy: MissTaxonomy }) {
  const activeKinds = MISS_KIND_DEFINITIONS.filter(
    (def) => taxonomy.counts[def.kind] > 0,
  );
  const summary =
    activeKinds.length > 0
      ? `This run: ${activeKinds
          .map((def) => {
            const count = taxonomy.counts[def.kind];
            return `${count} ${def.label.toLowerCase()}${count === 1 ? "" : "s"}`;
          })
          .join(" · ")}`
      : "No disagreements this run.";
  return (
    <Collapsible>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              How to read a disagreement
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground/80">{summary}</p>
          </div>
          <ChevronDown
            aria-hidden
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/40">
        {MISS_KIND_DEFINITIONS.map((def) => {
          const count = taxonomy.counts[def.kind];
          const active = count > 0;
          const instances = taxonomy.instances.filter(
            (m) => m.kind === def.kind,
          );
          const perRunNA = def.kind === "rule_era_difference";
          return (
            <div
              key={def.kind}
              className={cn(
                "flex items-start gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0",
                active && "bg-tag-gold-bg/15",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  active ? "bg-tag-gold-text" : "bg-muted-foreground/30",
                )}
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground">
                  {def.label}
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {def.meaning}
                </p>
                {instances.map((m) => (
                  <p
                    key={m.detail}
                    className="mt-1 text-xs leading-relaxed text-tag-gold-text"
                  >
                    {m.detail}
                  </p>
                ))}
              </div>
              <span className="shrink-0 pt-0.5">
                {active ? (
                  <Badge variant="chip-gold">
                    {count} this run
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground/60">
                    {perRunNA ? "Historical only" : "None"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const LEGEND_DESCRIPTIONS: Record<CommitteeAgreement, string> = {
  both_in:
    "In both the model's projected field and the committee's actual field.",
  model_only:
    "In the model's projected field but not the committee's. These rows carry a gold tint.",
  committee_only:
    "In the committee's field but not the model's. These rows carry a red tint.",
  both_out: "Outside both fields.",
};

/**
 * Every chip the comparison table uses, explained on demand: hover on
 * desktop, tap on touch (openOnHover keeps the click behavior, so both
 * work). Reuses the real Badge variants so the legend cannot drift.
 */
function LegendChip({ agreement }: { agreement: CommitteeAgreement }) {
  const chip = AGREEMENT_CHIP[agreement];
  const label = chip?.label ?? "Out in both";
  const description = LEGEND_DESCRIPTIONS[agreement];
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={0}
        render={
          <button
            type="button"
            aria-label={`${label}: ${description}`}
            className="cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        }
      >
        {chip ? (
          <Badge variant={chip.variant}>{chip.label}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Out in both</span>
        )}
      </PopoverTrigger>
      <PopoverContent side="top">{description}</PopoverContent>
    </Popover>
  );
}

function ChipLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Legend
      </span>
      {(
        ["both_in", "model_only", "committee_only", "both_out"] as const
      ).map((agreement) => (
        <LegendChip key={agreement} agreement={agreement} />
      ))}
    </div>
  );
}

/**
 * Model vs Committee: this run's projected field and ranks next to the
 * committee's published final rankings for the same season. Disagreements are
 * surfaced as the product's headline, not buried as errors.
 */
export function CommitteeComparisonPanel({
  data,
}: {
  data: CommitteeComparisonPayload;
}) {
  const s = data.summary;
  const modelOnly = data.teams.filter((t) => t.agreement === "model_only");
  const committeeOnly = data.teams.filter((t) => t.agreement === "committee_only");
  const hasDisagreement = modelOnly.length > 0 || committeeOnly.length > 0;
  const taxonomy = classifyDisagreements(data);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="px-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {METRIC_EXPLANATIONS.committee_comparison.label}
          </CardTitle>
          <InfoTooltip
            title={METRIC_EXPLANATIONS.committee_comparison.label}
            content={METRIC_EXPLANATIONS.committee_comparison.description}
            side="top"
          >
            <Badge variant="chip-neutral" className="cursor-help">
              {data.season}
            </Badge>
          </InfoTooltip>
        </div>
        <p className="text-sm text-muted-foreground">
          This run&apos;s projection next to the {data.reference_label.toLowerCase()}.
          The model is transparent and rules-based, so where it lands on a
          different team, you can trace exactly why.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            label="Field agreement"
            value={`${s.field_overlap_count} of ${s.committee_field_size}`}
            sub="Teams in both the model's projected field and the committee's actual field."
          />
          <SummaryStat
            label="First team out"
            value={s.model_first_team_out ?? "—"}
            sub={`Model's first team out. Committee: ${s.committee_first_team_out ?? "not documented"}.`}
          />
          {s.seed_exact_matches !== null ? (
            <SummaryStat
              label="Seeds matched"
              value={`${s.seed_exact_matches} of ${s.model_field_size}`}
              sub="Field teams the model seeded exactly where the committee did."
            />
          ) : null}
          <SummaryStat
            label="Reference"
            value={String(data.season)}
            sub={data.reference_label}
          />
        </div>

        {hasDisagreement ? (
          <div className="rounded-lg border border-tag-gold-border/60 bg-tag-gold-bg/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-tag-gold-text">
              Where they disagree
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {modelOnly.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">The model takes</span>
                  {modelOnly.map((row) => (
                    <DisagreementChip key={row.team} row={row} />
                  ))}
                </div>
              ) : null}
              {committeeOnly.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">
                    The committee selected
                  </span>
                  {committeeOnly.map((row) => (
                    <DisagreementChip key={row.team} row={row} />
                  ))}
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Click a team to open its resume and see the components behind the
              model&apos;s call.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            The model&apos;s projected field matches the committee&apos;s field
            exactly for this season.
          </p>
        )}

        <DisagreementTaxonomy taxonomy={taxonomy} />

        <ChipLegend />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 text-right tabular-nums">Cmte</th>
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2 text-right tabular-nums">Model</th>
                <th className="px-2 py-2 text-right">Shift</th>
                <th className="py-2 pl-2">Field</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((row) => (
                <tr
                  key={row.team}
                  className={cn(
                    "border-b border-border/40",
                    row.agreement === "model_only" && "bg-tag-gold-bg/20",
                    row.agreement === "committee_only" && "bg-tag-red-bg/15",
                  )}
                >
                  <td className="py-1.5 pr-2 text-right text-xs tabular-nums text-muted-foreground">
                    {row.committee_rank ?? "NR"}
                  </td>
                  <td className="px-1 py-1">
                    <TeamCell row={row} />
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                    {row.model_rank ?? "NR"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <RankShift delta={row.rank_delta} />
                  </td>
                  <td className="py-1.5 pl-2">
                    <AgreementChip agreement={row.agreement} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Committee ranks come from the {data.reference_label.toLowerCase()},
          checked into the repo from the official release. &quot;NR&quot; means a
          team was outside that side&apos;s published top 25. Shift is committee
          rank minus model rank; an up arrow means the model ranks the team
          higher than the committee did. Field agreement measures how closely
          the transparent model aligns with the committee&apos;s published
          selections; it is not a claim that the committee&apos;s picks are
          objectively correct. The comparison exists to make the differences
          auditable.
        </p>
      </CardContent>
    </Card>
  );
}
