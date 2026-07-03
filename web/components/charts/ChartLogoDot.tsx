"use client";

import * as React from "react";
import { useTeamAssetsContext } from "@/components/team/TeamAssetsProvider";
import { teamInitials } from "@/lib/format";
import { resolveTeamVisual, type ResolvedTeamVisual } from "@/lib/teamAssets";

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
 * Team logo as an SVG chart point: light circular surface (matches TeamLogoTile),
 * status ring, unified resolveTeamVisual fallbacks, initials on missing/failed load.
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
  const { assets } = useTeamAssetsContext();
  const resolved = resolveTeamVisual(
    team.team,
    {
      logoUrl: team.logo_url,
      abbreviation: team.abbreviation,
      primaryColor: team.primary_color,
    },
    assets,
  );

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      opacity={dimmed ? 0.55 : 1}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <title>{team.team}</title>
      <ChartLogoDotBody
        key={resolved.logoUrl ?? `${team.team}-initials`}
        team={team}
        resolved={resolved}
        size={size}
        ringColor={ringColor}
      />
    </g>
  );
}

function ChartLogoDotBody({
  team,
  resolved,
  size,
  ringColor,
}: {
  team: ChartTeamIdentity;
  resolved: ResolvedTeamVisual;
  size: number;
  ringColor: string;
}) {
  const clipId = React.useId();
  const r = size / 2;
  const ringR = r + 2.5;
  const [imageReady, setImageReady] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    if (!resolved.logoUrl) return;

    const img = new window.Image();
    img.onload = () => setImageReady(true);
    img.onerror = () => setImageFailed(true);
    img.src = resolved.logoUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [resolved.logoUrl]);

  const showLogo = Boolean(resolved.logoUrl) && imageReady && !imageFailed;
  const initials = teamInitials(team.team, resolved.abbreviation ?? team.abbreviation);

  return (
    <>
      <circle
        r={ringR}
        fill="var(--logo-surface)"
        stroke={ringColor}
        strokeWidth={1.5}
      />
      {showLogo ? (
        <>
          <clipPath id={clipId}>
            <circle r={r} />
          </clipPath>
          <image
            href={resolved.logoUrl!}
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
          fill={resolved.primaryColor ?? team.primary_color ?? "var(--muted-foreground)"}
        >
          {initials}
        </text>
      )}
    </>
  );
}
