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
  sm: { tile: 30, logo: 24 },
  md: { tile: 34, logo: 28 },
  lg: { tile: 40, logo: 32 },
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
  const { tile, logo } = MARK_SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border p-0.5",
        isChampion
          ? "border-tag-gold-border bg-tag-gold-bg"
          : "border-border bg-logo-surface",
        className,
      )}
      style={{ width: tile, height: tile }}
      aria-label={meta.displayName}
    >
      {showLogo ? (
        <Image
          src={meta.logoUrl!}
          alt=""
          width={logo}
          height={logo}
          unoptimized
          className="h-full w-full object-contain"
          onError={logoError}
        />
      ) : (
        <span className="text-[0.6rem] font-bold text-muted-foreground">
          {meta.shortLabel}
        </span>
      )}
    </span>
  );
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
  const logoSize = size === "lg" ? 14 : size === "md" ? 13 : 12;

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
        <Image
          src={meta.logoUrl!}
          alt=""
          width={logoSize}
          height={logoSize}
          unoptimized
          className="shrink-0 object-contain"
          onError={logoError}
        />
      ) : null}
      <span className="truncate">{meta.shortLabel}</span>
    </Badge>
  );
}
