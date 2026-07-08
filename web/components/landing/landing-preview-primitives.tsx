import type { ReactNode } from "react";
import { STATUS_LABEL } from "@/components/charts/SelectionStabilityBoard";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { Badge } from "@/components/ui/badge";
import { formatScore, formatPct } from "@/lib/format";
import { landingPanelTitle } from "@/lib/landing-typography";
import { teamName } from "@/lib/typography";
import type { SelectionStabilityTeam, TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the restrained landing previews. Extracted from the
 * old five-panel product board so the hero visual and the small product-surface
 * cards render identical, on-brand rows without re-importing full product pages.
 */

export function PanelChrome({
  title,
  eyebrow,
  className,
  children,
}: {
  title: string;
  eyebrow?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          {eyebrow ? (
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent-gold">
              {eyebrow}
            </span>
          ) : null}
          <h3 className={landingPanelTitle}>{title}</h3>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function FieldRow({ team }: { team: TeamSlot }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
      <SeedBadge seed={team.seed} isBye={team.is_bye} />
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={26}
      />
      <div className="min-w-0 flex-1">
        <p className={teamName}>{team.team}</p>
        <p className="truncate text-xs text-muted-foreground">{team.conference}</p>
      </div>
      <BidBadge bidType={team.bid_type} />
      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-foreground">
        {formatScore(team.composite_score)}
      </span>
    </div>
  );
}

export function StabilityRow({ team }: { team: SelectionStabilityTeam }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-background/40 px-2.5 py-2">
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={24}
      />
      <div className="min-w-0 flex-1">
        <p className={teamName}>{team.team}</p>
        <p className="text-xs text-muted-foreground">{STATUS_LABEL[team.status]}</p>
      </div>
      <Badge variant={team.status === "bubble" ? "chip-gold" : "chip-neutral"} className="tabular-nums">
        {formatPct(team.selection_frequency)}
      </Badge>
    </div>
  );
}
