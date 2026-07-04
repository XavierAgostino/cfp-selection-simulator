"use client";

import { Badge } from "@/components/ui/badge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { AppIcon } from "@/components/icons/AppIcon";
import { SCHEDULE_LOCATION_ICONS } from "@/components/icons/schedule-icons";
import type { ScheduleGame, Location } from "@/lib/types";
import { teamName } from "@/lib/typography";
import { cn } from "@/lib/utils";

const locationCopy: Record<Location, { label: string }> = {
  home: { label: "Home" },
  away: { label: "Away" },
  neutral: { label: "Neutral" },
};

interface ResumeScheduleListProps {
  schedule: ScheduleGame[];
  className?: string;
}

function ResultBadge({ result }: { result: ScheduleGame["result"] }) {
  const win = result === "W";
  return (
    <Badge
      variant={win ? "chip-green" : "chip-red"}
      className="h-5 w-5 justify-center rounded-full p-0 text-[0.65rem] font-bold"
      aria-label={win ? "Win" : "Loss"}
    >
      {result}
    </Badge>
  );
}

export function ResumeScheduleList({ schedule, className }: ResumeScheduleListProps) {
  if (schedule.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No schedule data for this team yet.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {schedule.map((game) => {
        const LocationIcon = SCHEDULE_LOCATION_ICONS[game.location];
        const win = game.result === "W";
        return (
          <div
            key={`${game.week}-${game.opponent}`}
            className="grid grid-cols-[2rem_1.75rem_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 border-b border-border/60 py-2.5 last:border-b-0"
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              W{game.week}
            </span>
            <TeamLogoTile team={game.opponent} size={24} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={teamName}>
                  {game.opponent}
                </span>
                {game.opponent_rank !== null ? (
                  <Badge
                    variant="chip-neutral"
                    className="h-4 shrink-0 px-1 text-[0.6rem] text-muted-foreground"
                  >
                    #{game.opponent_rank}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <AppIcon icon={LocationIcon} size={13} strokeWidth={1.75} />
                <span>{locationCopy[game.location].label}</span>
              </div>
            </div>
            <ResultBadge result={game.result} />
            <span
              className={cn(
                "w-12 shrink-0 text-right text-xs tabular-nums",
                win ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {game.points_for}-{game.points_against}
            </span>
          </div>
        );
      })}
    </div>
  );
}
