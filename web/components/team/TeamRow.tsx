import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { SeedBadge } from "@/components/team/SeedBadge";
import { BidBadge } from "@/components/team/BidBadge";
import { formatScore } from "@/lib/format";
import type { TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TeamRowProps {
  team: TeamSlot;
  onClick?: () => void;
  className?: string;
}

/** Logo + seed + name + conference + bid badge + composite score, clickable to open the resume drawer. */
export function TeamRow({ team, onClick, className }: TeamRowProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors duration-150",
        onClick && "cursor-pointer hover:border-border hover:bg-card",
        className,
      )}
    >
      <SeedBadge seed={team.seed} isBye={team.is_bye} />
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {team.team}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {team.conference}
        </span>
      </div>
      <BidBadge bidType={team.bid_type} />
      <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums text-foreground">
        {formatScore(team.composite_score)}
      </span>
    </Comp>
  );
}
