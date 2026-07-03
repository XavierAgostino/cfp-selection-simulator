"use client";

import { useState } from "react";
import Image from "next/image";
import { useTeamAssetsContext } from "@/components/team/TeamAssetsProvider";
import { teamInitials } from "@/lib/format";
import { resolveTeamVisual } from "@/lib/teamAssets";
import { logoSurfaceFrameClass } from "@/lib/logoSurface";
import { cn } from "@/lib/utils";

interface TeamLogoTileProps {
  team: string;
  logoUrl?: string | null;
  abbreviation?: string | null;
  primaryColor?: string | null;
  size?: number;
  className?: string;
}

/**
 * ESPN-style logo tile: full-color mark on a light circular surface.
 * Falls back to team-assets.json and ESPN id map when logo_url is missing.
 */
export function TeamLogoTile({
  team,
  logoUrl,
  abbreviation,
  primaryColor,
  size = 28,
  className,
}: TeamLogoTileProps) {
  const { assets } = useTeamAssetsContext();
  const resolved = resolveTeamVisual(
    team,
    { logoUrl, abbreviation, primaryColor },
    assets,
  );
  const [errored, setErrored] = useState(false);
  const showFallback = !resolved.logoUrl || errored;
  const frameSize = size + 6;
  const imageSize = Math.max(size - 2, 16);

  if (showFallback) {
    return (
      <div
        className={cn(
          logoSurfaceFrameClass("text-[0.65rem] font-semibold text-foreground"),
          className,
        )}
        style={{
          width: frameSize,
          height: frameSize,
          backgroundColor: resolved.primaryColor ?? undefined,
          color: resolved.primaryColor ? "#ffffff" : undefined,
        }}
        aria-label={team}
        title={team}
      >
        {teamInitials(team, resolved.abbreviation)}
      </div>
    );
  }

  return (
    <div
      className={logoSurfaceFrameClass(className)}
      style={{ width: frameSize, height: frameSize }}
      aria-label={team}
      title={team}
    >
      <Image
        src={resolved.logoUrl!}
        alt=""
        width={imageSize}
        height={imageSize}
        unoptimized
        className="h-full w-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
