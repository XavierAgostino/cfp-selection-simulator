"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResumeScheduleList } from "@/components/team/ResumeScheduleList";
import type { ScheduleGame } from "@/lib/types";

/** Games shown before the list collapses; keeps long schedules from dominating the page (esp. on mobile). */
const COLLAPSED_COUNT = 6;

/**
 * Full schedule that collapses to the first {@link COLLAPSED_COUNT} games with a
 * toggle to reveal the rest. Shorter schedules render in full with no toggle.
 */
export function CollapsibleSchedule({ schedule }: { schedule: ScheduleGame[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const canCollapse = schedule.length > COLLAPSED_COUNT;
  const visible =
    expanded || !canCollapse ? schedule : schedule.slice(0, COLLAPSED_COUNT);

  return (
    <div className="flex flex-col gap-1">
      <ResumeScheduleList schedule={visible} />
      {canCollapse ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show fewer games" : `Show all ${schedule.length} games`}
          <ChevronDown
            data-icon="inline-end"
            className={expanded ? "rotate-180" : undefined}
          />
        </Button>
      ) : null}
    </div>
  );
}
