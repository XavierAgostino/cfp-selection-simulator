"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MetricTooltip } from "@/components/explain/InfoTooltip";
import { ScoreBar } from "@/components/common/ScoreBar";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatScore, formatRecord } from "@/lib/format";
import { recordColumnLabel, recordColumnTooltip } from "@/lib/recordMeta";
import type { ScoreMetricKey } from "@/lib/scoreBars";
import type { RankingRow, RecordMeta } from "@/lib/types";
import { teamName } from "@/lib/typography";

const columnHelper = createColumnHelper<RankingRow>();

function ScoreCell({
  value,
  metric,
}: {
  value: number;
  metric: ScoreMetricKey;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-sm tabular-nums text-foreground">
        {formatScore(value)}
      </span>
      <ScoreBar value={value} metric={metric} className="w-16" />
    </div>
  );
}

function RecordHeader({ recordMeta }: { recordMeta?: RecordMeta | null }) {
  const label = recordColumnLabel(recordMeta);
  const tooltip = recordColumnTooltip(recordMeta);
  return (
    <Tooltip>
      <TooltipTrigger
        tabIndex={0}
        className="cursor-help border-b border-dotted border-muted-foreground/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function createRankingColumns(recordMeta?: RecordMeta | null) {
  return [
    columnHelper.accessor("rank", {
      id: "rank",
      header: "Rank",
      cell: (info) => (
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {info.getValue()}
        </span>
      ),
      sortingFn: "basic",
      size: 56,
    }),
    columnHelper.accessor("team", {
      id: "team",
      header: "Team",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamLogoTile
              team={row.team}
              logoUrl={row.logo_url}
              abbreviation={row.abbreviation}
              primaryColor={row.primary_color}
              size={26}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={teamName}>
                  {row.team}
                </span>
                {row.is_conference_champion ? (
                  <ConferenceBadge
                    conference={row.conference}
                    isChampion
                    championOf={row.champion_of}
                    size="lg"
                  />
                ) : null}
              </div>
              {!row.is_conference_champion ? (
                <ConferenceCaption conference={row.conference} />
              ) : null}
            </div>
          </div>
        );
      },
      sortingFn: "alphanumeric",
      size: 260,
    }),
    columnHelper.accessor("bid_type", {
      id: "bid",
      header: "Bid",
      cell: (info) => <BidBadge bidType={info.getValue()} />,
      enableSorting: false,
      size: 96,
    }),
    columnHelper.accessor("seed", {
      id: "seed",
      header: "Seed",
      cell: (info) => (
        <SeedBadge
          seed={info.getValue()}
          isBye={(info.getValue() ?? 99) <= 4}
        />
      ),
      sortingFn: (a, b) => (a.original.seed ?? 99) - (b.original.seed ?? 99),
      size: 64,
    }),
    columnHelper.accessor("composite_score", {
      id: "composite",
      header: () => (
        <div className="text-right">
          <MetricTooltip metric="composite" />
        </div>
      ),
      cell: (info) => (
        <ScoreCell value={info.getValue()} metric="composite" />
      ),
      sortingFn: "basic",
      size: 96,
    }),
    columnHelper.accessor("resume_score", {
      id: "resume",
      header: () => (
        <div className="text-right">
          <MetricTooltip metric="resume" />
        </div>
      ),
      cell: (info) => <ScoreCell value={info.getValue()} metric="resume" />,
      sortingFn: "basic",
      size: 96,
    }),
    columnHelper.accessor("predictive_score", {
      id: "predictive",
      header: () => (
        <div className="text-right">
          <MetricTooltip metric="predictive" />
        </div>
      ),
      cell: (info) => <ScoreCell value={info.getValue()} metric="predictive" />,
      sortingFn: "basic",
      size: 96,
    }),
    columnHelper.accessor("sor", {
      id: "sor",
      header: () => (
        <div className="text-right">
          <MetricTooltip metric="sor" />
        </div>
      ),
      cell: (info) => <ScoreCell value={info.getValue()} metric="sor" />,
      sortingFn: "basic",
      size: 96,
    }),
    columnHelper.accessor("sos", {
      id: "sos",
      header: () => (
        <div className="text-right">
          <MetricTooltip metric="sos" />
        </div>
      ),
      cell: (info) => <ScoreCell value={info.getValue()} metric="sos" />,
      sortingFn: "basic",
      size: 96,
    }),
    columnHelper.accessor((row) => row.record.wins - row.record.losses, {
      id: "record",
      header: () => (
        <div className="text-right">
          <RecordHeader recordMeta={recordMeta} />
        </div>
      ),
      cell: (info) => (
        <span className="block text-right text-sm tabular-nums text-foreground">
          {formatRecord(info.row.original.record)}
        </span>
      ),
      sortingFn: "basic",
      size: 88,
    }),
  ];
}

/** Default columns without record metadata (legacy runs). */
export const rankingColumns = createRankingColumns();
