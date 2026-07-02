"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamRow } from "@/components/team/TeamRow";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { TeamSlot } from "@/lib/types";

interface ProjectedFieldPanelProps {
  field: TeamSlot[];
}

/** The 12-team field grouped into first-round byes (1-4) and first-round games (5-12). */
export function ProjectedFieldPanel({ field }: ProjectedFieldPanelProps) {
  const { openTeam } = useTeamDrawer();
  const byes = field.filter((team) => team.seed !== null && team.seed <= 4);
  const games = field.filter((team) => team.seed !== null && team.seed > 4);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="px-4">
        <CardTitle>Projected Field</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div>
          <div className="mb-1 flex items-center gap-2 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-tag-gold-dot" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-tag-gold-text">
              First-Round Byes
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {byes.map((team) => (
              <TeamRow
                key={team.team}
                team={team}
                onClick={() => openTeam(team.team)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              First-Round Games
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {games.map((team) => (
              <TeamRow
                key={team.team}
                team={team}
                onClick={() => openTeam(team.team)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
