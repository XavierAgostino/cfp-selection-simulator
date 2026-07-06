"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsUpDown,
  SearchX,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { TeamHoverCard } from "@/components/team/TeamHoverCard";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { useActiveRun } from "@/components/team/useActiveRun";
import { createRankingColumns } from "@/components/rankings/columns";
import {
  TableToolbar,
  type BidStatusFilter,
} from "@/components/rankings/TableToolbar";
import { buildCsv, downloadCsv } from "@/lib/exportCsv";
import { formatRecord, formatScore } from "@/lib/format";
import type { RankingRow, RecordMeta } from "@/lib/types";
import { teamName } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Compact tappable team card — the mobile stand-in for one table row. */
function RankingCard({
  team,
  onOpen,
}: {
  team: RankingRow;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open resume for ${team.team}`}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors",
        "hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        team.in_field && "bg-secondary/20",
      )}
    >
      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-foreground">
        {team.rank}
      </span>
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={30}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={teamName}>{team.team}</span>
        <span className="text-xs text-muted-foreground">
          {team.conference} &middot; {formatRecord(team.record)}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm tabular-nums text-foreground">
          {formatScore(team.composite_score)}
        </span>
        <BidBadge bidType={team.bid_type} />
      </div>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground/60"
      />
    </button>
  );
}

interface RankingTableProps {
  teams: RankingRow[];
  recordMeta?: RecordMeta | null;
  /** Season/week of the payload, used to name the CSV download. */
  season?: number;
  week?: number;
}

/** Full-table CSV mirroring the engine's rankings CSV plus web enrichment. */
function rankingsCsv(teams: RankingRow[]): string {
  const headers = [
    "rank",
    "team",
    "abbreviation",
    "conference",
    "wins",
    "losses",
    "composite_score",
    "resume_score",
    "predictive_score",
    "sor",
    "sos",
    "conference_champion",
    "in_field",
    "bid_type",
    "seed",
  ];
  const rows = [...teams]
    .sort((a, b) => a.rank - b.rank)
    .map((t) => [
      t.rank,
      t.team,
      t.abbreviation,
      t.conference,
      t.record.wins,
      t.record.losses,
      t.composite_score,
      t.resume_score,
      t.predictive_score,
      t.sor,
      t.sos,
      t.is_conference_champion,
      t.in_field,
      t.bid_type,
      t.seed,
    ]);
  return buildCsv(headers, rows);
}

/** Sortable, filterable rankings table over rankings.json.teams. */
export function RankingTable({ teams, recordMeta, season, week }: RankingTableProps) {
  const stem = useActiveRun();
  const { openTeam } = useTeamDrawer();
  const [search, setSearch] = React.useState("");
  const [conference, setConference] = React.useState("all");
  const [bidStatus, setBidStatus] = React.useState<BidStatusFilter>("all");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "rank", desc: false },
  ]);

  React.useEffect(() => {
    if (window.location.hash !== "#search") return;
    const input = document.getElementById("rankings-search");
    if (!(input instanceof HTMLInputElement)) return;
    input.focus({ preventScroll: false });
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const conferences = React.useMemo(
    () => Array.from(new Set(teams.map((t) => t.conference))).sort(),
    [teams],
  );

  // The bubble is defined relative to the cut line: the highest (worst) rank
  // currently in the field. Anyone outside the field within 8 ranks of that
  // cut is "on the bubble"; everyone further back is simply "out".
  const cutRank = React.useMemo(() => {
    const inField = teams.filter((t) => t.in_field);
    if (inField.length === 0) return 0;
    return Math.max(...inField.map((t) => t.rank));
  }, [teams]);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (query && !t.team.toLowerCase().includes(query)) return false;
      if (conference !== "all" && t.conference !== conference) return false;
      switch (bidStatus) {
        case "in_field":
          return t.in_field;
        case "auto":
          return t.bid_type === "auto";
        case "at_large":
          return t.bid_type === "at_large";
        case "bubble":
          return !t.in_field && t.rank - cutRank <= 8;
        case "out":
          return !t.in_field && t.rank - cutRank > 8;
        default:
          return true;
      }
    });
  }, [teams, search, conference, bidStatus, cutRank]);

  const columns = React.useMemo(
    () => createRankingColumns(recordMeta),
    [recordMeta],
  );

  // Always exports the full table in rank order — filters never change the
  // artifact, so a downloaded CSV is reproducible from the run alone.
  const handleDownloadCsv = React.useCallback(() => {
    const runPart =
      stem ?? (season && week ? `${season}_week${week}` : "latest");
    downloadCsv(`selection-room_${runPart}_rankings.csv`, rankingsCsv(teams));
  }, [teams, stem, season, week]);

  // TanStack Table returns unstable function refs; React Compiler skips this hook by design.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        conference={conference}
        onConferenceChange={setConference}
        conferences={conferences}
        bidStatus={bidStatus}
        onBidStatusChange={setBidStatus}
        resultCount={filtered.length}
        onDownloadCsv={handleDownloadCsv}
      />
      {/* Mobile: compact card list; the full table needs more width than a phone has. */}
      <div className="flex flex-col gap-2 md:hidden">
        {table.getRowModel().rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-card py-16 text-muted-foreground">
            <SearchX className="h-5 w-5" />
            <span className="text-sm">No teams match these filters.</span>
          </div>
        ) : (
          table.getRowModel().rows.map((row) => (
            <RankingCard
              key={row.id}
              team={row.original}
              onOpen={() => openTeam(row.original.team)}
            />
          ))
        )}
      </div>
      <div className="hidden overflow-hidden rounded-xl bg-card md:block">
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "bg-card text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          canSort && "cursor-pointer select-none",
                        )}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            [
                              "composite",
                              "resume",
                              "predictive",
                              "sor",
                              "sos",
                              "record",
                            ].includes(header.column.id) && "justify-end",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sortDir === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-40" />
                            )
                          ) : null}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <SearchX className="h-5 w-5" />
                      <span className="text-sm">No teams match these filters.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const team = row.original;
                  return (
                    <TeamHoverCard key={row.id} team={team}>
                      <TableRow
                        tabIndex={0}
                        role="button"
                        aria-label={`Open resume for ${team.team}`}
                        onClick={() => openTeam(team.team)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openTeam(team.team);
                          }
                        }}
                        className={cn(
                          "group cursor-pointer outline-none focus-visible:bg-secondary/60",
                          team.in_field && "bg-secondary/20",
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TeamHoverCard>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
