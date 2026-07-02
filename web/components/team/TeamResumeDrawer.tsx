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
import { ResumeContent } from "@/components/team/ResumeContent";
import { useActiveRun } from "@/components/team/useActiveRun";
import { useTeamResumes } from "@/components/team/useTeamResumes";

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
  const state = useTeamResumes(stem);
  const resume = team && state.status === "ready" ? state.data.teams[team] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>{team ?? "Team"}</SheetTitle>
          <SheetDescription>Team resume</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          {state.status === "loading" ? (
            <div className="flex flex-col gap-4 pt-2">
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
          ) : state.status === "error" ? (
            <div className="pt-2">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title="Couldn't load team resumes"
                description="team-resumes.json failed to load. Try again once the exporter has run."
              />
            </div>
          ) : !team ? null : resume ? (
            <ResumeContent
              resume={resume}
              variant="drawer"
              footer={
                <Link
                  href={`/teams/${encodeURIComponent(team)}`}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  onClick={() => onOpenChange(false)}
                >
                  Full team page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <div className="pt-2">
              <EmptyState
                icon={<SearchX className="h-5 w-5" />}
                title={`No resume for ${team}`}
                description="This team falls outside the top 40 tracked in team-resumes.json this week."
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
