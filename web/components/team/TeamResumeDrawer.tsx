"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export type TeamResumeDrawerProps = {
  team: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Team resume drawer, reachable from every page via useTeamDrawer().
 * Placeholder shell — full resume content (metric cards, why-in/concerns,
 * schedule) is built in the rankings workstream.
 */
export function TeamResumeDrawer({
  team,
  open,
  onOpenChange,
}: TeamResumeDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{team ?? "Team"}</SheetTitle>
          <SheetDescription>Team resume</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
