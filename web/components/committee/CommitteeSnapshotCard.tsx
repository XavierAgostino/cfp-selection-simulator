"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/explain/InfoTooltip";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type {
  CommitteeComparisonPayload,
  CommitteeComparisonTeam,
} from "@/lib/types";
import { metricValueLg } from "@/lib/typography";

function InlineTeam({ row }: { row: CommitteeComparisonTeam }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(row.team)}
      aria-label={`Open resume for ${row.team}`}
      className="inline-flex items-center gap-1 rounded font-semibold text-foreground underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <TeamLogoTile
        team={row.team}
        logoUrl={row.logo_url}
        abbreviation={row.abbreviation}
        primaryColor={row.primary_color}
        size={14}
      />
      {row.team}
    </button>
  );
}

/**
 * Compact dashboard summary of the Model vs Committee comparison. Links to the
 * full table on /validation, preserving the current run.
 */
export function CommitteeSnapshotCard({
  data,
  stem,
}: {
  data: CommitteeComparisonPayload;
  stem: string | null;
}) {
  const s = data.summary;
  const modelOnly = data.teams.filter((t) => t.agreement === "model_only");
  const committeeOnly = data.teams.filter((t) => t.agreement === "committee_only");
  const href = stem ? `/validation?run=${encodeURIComponent(stem)}` : "/validation";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <InfoTooltip
          title={METRIC_EXPLANATIONS.committee_comparison.label}
          content={METRIC_EXPLANATIONS.committee_comparison.description}
          side="top"
        >
          <CardTitle className="cursor-help">
            {METRIC_EXPLANATIONS.committee_comparison.label}
          </CardTitle>
        </InfoTooltip>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Full comparison
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="px-4">
        <div className={metricValueLg}>
          {s.field_overlap_count} of {s.committee_field_size}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Teams in both the model&apos;s projected field and the committee&apos;s
          actual {data.season} field.
        </p>
        {modelOnly.length > 0 || committeeOnly.length > 0 ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed text-muted-foreground">
            {modelOnly.length > 0 ? (
              <>
                <span>The model takes</span>
                {modelOnly.map((row) => (
                  <InlineTeam key={row.team} row={row} />
                ))}
              </>
            ) : null}
            {committeeOnly.length > 0 ? (
              <>
                <span>{modelOnly.length > 0 ? "; the committee selected" : "The committee selected"}</span>
                {committeeOnly.map((row) => (
                  <InlineTeam key={row.team} row={row} />
                ))}
              </>
            ) : null}
            <span>. That disagreement is worth auditing.</span>
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The projected field matches the committee&apos;s field exactly.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
