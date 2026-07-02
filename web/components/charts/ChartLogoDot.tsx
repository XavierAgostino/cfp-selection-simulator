"use client";

import * as React from "react";
import { teamInitials } from "@/lib/format";

export interface ChartTeamIdentity {
  team: string;
  abbreviation: string | null;
  logo_url: string | null;
  primary_color: string | null;
}

interface ChartLogoDotProps {
  cx: number;
  cy: number;
  team: ChartTeamIdentity;
  /** Logo diameter in px. */
  size?: number;
  /** Status ring color (a CSS color or var()). */
  ringColor: string;
  /** Fades teams outside the field so in-field teams read first. */
  dimmed?: boolean;
  onClick?: () => void;
}

/**
 * A team logo rendered as an SVG chart point: circular tile, status ring,
 * initials fallback when the team has no logo. Shared by the scatter and
 * cutline charts so points look identical everywhere.
 */
export function ChartLogoDot({
  cx,
  cy,
  team,
  size = 22,
  ringColor,
  dimmed = false,
  onClick,
}: ChartLogoDotProps) {
  const clipId = React.useId();
  const r = size / 2;

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      opacity={dimmed ? 0.55 : 1}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <title>{team.team}</title>
      <circle r={r + 2.5} fill="var(--card)" stroke={ringColor} strokeWidth={1.5} />
      {team.logo_url ? (
        <>
          <clipPath id={clipId}>
            <circle r={r} />
          </clipPath>
          <image
            href={team.logo_url}
            x={-r}
            y={-r}
            width={size}
            height={size}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid meet"
          />
        </>
      ) : (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.42}
          fontWeight={700}
          fill={team.primary_color ?? "var(--muted-foreground)"}
        >
          {teamInitials(team.team, team.abbreviation)}
        </text>
      )}
    </g>
  );
}
