"use client";

import { useMemo } from "react";
import {
  STATUS_LABEL,
  StabilityStatusChips,
  formatPct,
  ringColor,
} from "@/components/charts/SelectionStabilityBoard";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import type { SelectionStabilityTeam, SensitivityPayload } from "@/lib/types";

function ClosestCallRow({ team }: { team: SelectionStabilityTeam }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(team.team)}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/40"
    >
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={24}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        <span className="mr-1.5 text-xs text-muted-foreground">
          #{team.base_rank}
        </span>
        {team.team}
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: ringColor(team.status) }}
        />
        {STATUS_LABEL[team.status]}
      </span>
      <span className="w-14 text-right text-sm font-medium tabular-nums text-foreground">
        {formatPct(team.selection_frequency)}
      </span>
    </button>
  );
}

/**
 * Compact Selection Stability state for runs with no contested bubble: every
 * team held its in/out spot across the weight scenarios, so instead of a
 * near-empty board this shows the status counts and the closest calls on
 * either side of the cut.
 */
export function SelectionStabilitySummary({
  sensitivity,
}: {
  sensitivity: SensitivityPayload;
}) {
  const closestCalls = useMemo(() => {
    const firstOut = sensitivity.teams
      .filter((team) => !team.base_selected)
      .sort((a, b) => a.base_rank - b.base_rank)
      .slice(0, 2);
    const lastIn = sensitivity.teams
      .filter((team) => team.base_selected)
      .sort((a, b) => b.base_rank - a.base_rank)
      .slice(0, 2);
    return [...firstOut, ...lastIn];
  }, [sensitivity.teams]);

  return (
    <div className="flex flex-col gap-3">
      <StabilityStatusChips teams={sensitivity.teams} />

      {closestCalls.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Closest calls
          </h3>
          <div className="flex flex-col">
            {closestCalls.map((team) => (
              <ClosestCallRow key={team.team} team={team} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-[0.65rem] text-muted-foreground">
        Based on {sensitivity.n_scenarios.toLocaleString()} scenarios that vary
        each model weight by ±
        {Math.round(sensitivity.perturbation_spec.relative_range * 100)}%.
        Selection Stability changes model weights around the current run. It
        does not simulate future game outcomes, and conference champions stay
        fixed.
      </p>
    </div>
  );
}
