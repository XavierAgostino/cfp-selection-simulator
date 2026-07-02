"use client";

import { useState } from "react";
import Image from "next/image";
import { teamInitials } from "@/lib/format";
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
 * Renders a team's ESPN logo, falling back to a colored initials tile when
 * the logo is missing or fails to load (offline dev, bad URL, etc.).
 */
export function TeamLogoTile({
  team,
  logoUrl,
  abbreviation,
  primaryColor,
  size = 28,
  className,
}: TeamLogoTileProps) {
  const [errored, setErrored] = useState(false);
  const showFallback = !logoUrl || errored;

  if (showFallback) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold text-white",
          className,
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: primaryColor ?? "#1F2937",
        }}
        aria-label={team}
        title={team}
      >
        {teamInitials(team, abbreviation)}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={team}
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 object-contain", className)}
      onError={() => setErrored(true)}
    />
  );
}
