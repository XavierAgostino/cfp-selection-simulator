"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";

/**
 * Inline logo + name chip for team mentions in prose, headings, or table
 * cells. Resolves the logo from team-assets.json via TeamAssetsProvider and
 * opens the team resume drawer on click. Presentation-only: the team name
 * string is rendered exactly as supplied.
 */
export function TeamChip({ team, size = 12 }: { team: string; size?: number }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(team)}
      aria-label={`Open resume for ${team}`}
      className="inline-flex -translate-y-px items-center gap-1 rounded-md border border-border bg-secondary/60 px-1.5 py-px align-middle text-xs font-semibold normal-case tracking-normal text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <TeamLogoTile team={team} size={size} />
      {team}
    </button>
  );
}
