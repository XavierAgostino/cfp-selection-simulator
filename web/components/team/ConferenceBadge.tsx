"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getConferenceMeta } from "@/lib/conferences";
import { championLogoRingClass, logoSurfaceFrameClass } from "@/lib/logoSurface";
import { cn } from "@/lib/utils";

interface ConferenceBadgeProps {
  conference: string;
  /** Conference champion — gold ring on the logo mark. */
  isChampion?: boolean;
  /** Override tooltip league name (from champion_of when it differs). */
  championOf?: string | null;
  /** `mark` = prominent logo tile inline with team name; `chip` = compact pill for tight rows. */
  variant?: "mark" | "chip";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MARK_SIZES = {
  sm: { frame: 28, logo: 22 },
  md: { frame: 32, logo: 26 },
  lg: { frame: 38, logo: 30 },
} as const;

const CHIP_LOGO_SIZES = {
  sm: { frame: 16, logo: 12 },
  md: { frame: 18, logo: 14 },
  lg: { frame: 20, logo: 16 },
} as const;

/**
 * League identifier — logo mark for conference champions only.
 * Pair with ConferenceCaption for non-champions (text under team name).
 */
export function ConferenceBadge({
  conference,
  isChampion = false,
  championOf,
  variant = "mark",
  size = "sm",
  className,
}: ConferenceBadgeProps) {
  const [logoError, setLogoError] = useState(false);

  if (!isChampion && variant === "mark") {
    return null;
  }

  const meta = getConferenceMeta(conference);
  const showLogo = meta.logoUrl !== null && !logoError;

  const league = championOf ?? meta.displayName;
  const tooltipText = isChampion
    ? `${league} conference champion`
    : meta.displayName;

  const content =
    variant === "mark" ? (
      <ConferenceMark
        meta={meta}
        showLogo={showLogo}
        logoError={() => setLogoError(true)}
        isChampion={isChampion}
        size={size}
        className={className}
      />
    ) : (
      <ConferenceChip
        meta={meta}
        showLogo={showLogo}
        logoError={() => setLogoError(true)}
        isChampion={isChampion}
        size={size}
        className={className}
      />
    );

  return (
    <Tooltip>
      <TooltipTrigger render={content} />
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

/** Muted conference name for non-champion rows — sits under the team name. */
export function ConferenceCaption({
  conference,
  className,
}: {
  conference: string;
  className?: string;
}) {
  const meta = getConferenceMeta(conference);

  return (
    <span
      className={cn("truncate text-xs text-muted-foreground", className)}
      title={meta.displayName}
    >
      {meta.displayName}
    </span>
  );
}

function ConferenceLogoImage({
  src,
  logoSize,
  onError,
}: {
  src: string;
  logoSize: number;
  onError: () => void;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={logoSize}
      height={logoSize}
      unoptimized
      className="h-full w-full object-contain"
      onError={onError}
    />
  );
}

function ConferenceMark({
  meta,
  showLogo,
  logoError,
  isChampion,
  size,
  className,
}: {
  meta: ReturnType<typeof getConferenceMeta>;
  showLogo: boolean;
  logoError: () => void;
  isChampion: boolean;
  size: "sm" | "md" | "lg";
  className?: string;
}) {
  const { frame, logo } = MARK_SIZES[size];

  const tile = (
    <span
      className={logoSurfaceFrameClass(className)}
      style={{ width: frame, height: frame }}
      aria-label={meta.displayName}
    >
      {showLogo ? (
        <ConferenceLogoImage
          src={meta.logoUrl!}
          logoSize={logo}
          onError={logoError}
        />
      ) : (
        <span className="text-[0.55rem] font-bold text-muted-foreground">
          {meta.shortLabel}
        </span>
      )}
    </span>
  );

  if (isChampion) {
    return <span className={championLogoRingClass()}>{tile}</span>;
  }

  return tile;
}

function ConferenceChip({
  meta,
  showLogo,
  logoError,
  isChampion,
  size,
  className,
}: {
  meta: ReturnType<typeof getConferenceMeta>;
  showLogo: boolean;
  logoError: () => void;
  isChampion: boolean;
  size: "sm" | "md" | "lg";
  className?: string;
}) {
  const { frame, logo } = CHIP_LOGO_SIZES[size];

  return (
    <Badge
      variant={isChampion ? "chip-gold" : "chip-neutral"}
      className={cn(
        "max-w-full cursor-default gap-1 font-medium",
        size === "lg" ? "h-5 px-2 text-[0.65rem]" : "h-4 px-1.5 text-[0.6rem]",
        className,
      )}
    >
      {showLogo ? (
        <span
          className={logoSurfaceFrameClass("p-px")}
          style={{ width: frame, height: frame }}
        >
          <ConferenceLogoImage
            src={meta.logoUrl!}
            logoSize={logo}
            onError={logoError}
          />
        </span>
      ) : null}
      <span className="truncate">{meta.shortLabel}</span>
    </Badge>
  );
}
