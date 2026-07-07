"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ResumeExportButton } from "@/components/share/ResumeExportButton";
import { ResumeContent } from "@/components/team/ResumeContent";
import { useActiveRun } from "@/components/team/useActiveRun";
import { useRankings } from "@/components/team/useRankings";
import { useTeamResumes } from "@/components/team/useTeamResumes";
import { synthesizeSummaryResume } from "@/lib/synthesizeResume";
import type { TeamResume } from "@/lib/types";

export type TeamResumeDrawerProps = {
  team: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Team resume drawer, reachable from every page via useTeamDrawer(). Reads
 * the active run's team-resumes.json (cached per run via useTeamResumes so
 * repeated opens across a browsing session are instant) and renders the
 * shared ResumeContent body.
 */
export function TeamResumeDrawer({
  team,
  open,
  onOpenChange,
}: TeamResumeDrawerProps) {
  const stem = useActiveRun();
  const resumeState = useTeamResumes(stem);
  const rankingsState = useRankings(stem);

  const resume: TeamResume | null = React.useMemo(() => {
    if (!team) return null;
    if (resumeState.status === "ready" && resumeState.data.teams[team]) {
      return resumeState.data.teams[team];
    }
    if (rankingsState.status === "ready") {
      const row = rankingsState.data.teams.find((t) => t.team === team);
      if (row) return synthesizeSummaryResume(row);
    }
    return null;
  }, [team, resumeState, rankingsState]);

  const recordMeta = React.useMemo(() => {
    if (resumeState.status === "ready" && resumeState.data.record_meta) {
      return resumeState.data.record_meta;
    }
    if (rankingsState.status === "ready") {
      return rankingsState.data.record_meta ?? null;
    }
    return null;
  }, [resumeState, rankingsState]);

  const seasonWeek = React.useMemo(() => {
    if (resumeState.status === "ready") {
      return { season: resumeState.data.season, week: resumeState.data.week };
    }
    if (rankingsState.status === "ready") {
      return {
        season: rankingsState.data.season,
        week: rankingsState.data.week,
      };
    }
    return null;
  }, [resumeState, rankingsState]);

  const loading =
    resumeState.status === "loading" ||
    (resumeState.status === "ready" &&
      team &&
      !resumeState.data.teams[team] &&
      rankingsState.status === "loading");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>{team ?? "Team"}</SheetTitle>
          <SheetDescription>Team resume</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col pb-4">
          {loading ? (
            <div className="flex flex-col gap-4 px-4 pt-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-13 w-13 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-full w-full flex-1" />
            </div>
          ) : resumeState.status === "error" && rankingsState.status === "error" ? (
            <div className="px-4 pt-2">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Couldn't load team resumes"
                description="team-resumes.json failed to load. Try again once the exporter has run."
              />
            </div>
          ) : !team ? null : resume ? (
            <ResumeContent
              resume={resume}
              recordMeta={recordMeta}
              variant="drawer"
              footer={
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ResumeExportButton
                    resume={resume}
                    recordMeta={recordMeta}
                    season={seasonWeek?.season}
                    week={seasonWeek?.week}
                    className="w-full"
                  />
                  <Link
                    href={`/teams/${encodeURIComponent(team)}`}
                    className="flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    onClick={() => onOpenChange(false)}
                  >
                    Full team page
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="px-4 pt-2">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title={`No resume for ${team}`}
                description="This team is not in the rankings for this run."
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
