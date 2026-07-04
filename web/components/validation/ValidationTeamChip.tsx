"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { badgeVariants } from "@/components/ui/badge";
import {
  VALIDATION_TEAM_ROLES,
  type ValidationTeamRole,
} from "@/lib/validationExplain";
import { cn } from "@/lib/utils";

export interface ValidationTeamChipProps {
  team: string;
  role: ValidationTeamRole;
  year: number;
  ruleTarget?: string;
  modelRank?: number | null;
  committeeRank?: number | null;
}

function contextualDetail(
  role: ValidationTeamRole,
  team: string,
  year: number,
  ruleTarget?: string,
): string | null {
  if (role === "model_added" && ruleTarget) {
    return `The model placed ${team} inside the projected field under the ${year} ${ruleTarget} ruleset, while the committee did not.`;
  }
  if (role === "model_dropped" && ruleTarget) {
    return `The committee selected ${team}, but the model's era-correct field left them outside the projected field under ${year} ${ruleTarget}.`;
  }
  return null;
}

function ValidationTeamHoverContent({
  team,
  role,
  year,
  ruleTarget,
  modelRank,
  committeeRank,
}: ValidationTeamChipProps) {
  const copy = VALIDATION_TEAM_ROLES[role];
  const detail = contextualDetail(role, team, year, ruleTarget);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <TeamLogoTile team={team} size={28} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{team}</p>
          <p className="text-xs text-muted-foreground">{copy.statusLine}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-popover-foreground/85">
        {copy.explanation}
      </p>
      {detail ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      ) : null}
      {modelRank != null || committeeRank != null ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {modelRank != null ? (
            <div>
              <dt className="text-muted-foreground">Model rank</dt>
              <dd className="font-semibold tabular-nums text-foreground">#{modelRank}</dd>
            </div>
          ) : null}
          {committeeRank != null ? (
            <div>
              <dt className="text-muted-foreground">Committee rank</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                #{committeeRank}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="text-xs tabular-nums text-muted-foreground">
        {year}
        {ruleTarget ? ` · ${ruleTarget}` : ""}
      </p>
    </div>
  );
}

/** Compact logo chip with validation-specific hover (not the active-run team drawer). */
export function ValidationTeamChip(props: ValidationTeamChipProps) {
  const { team, role } = props;
  const copy = VALIDATION_TEAM_ROLES[role];

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        render={
          <span
            tabIndex={0}
            aria-label={`${copy.roleLabel}: ${team}`}
            className={cn(
              badgeVariants({ variant: copy.chipVariant }),
              "inline-flex h-auto cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        <TeamLogoTile team={team} size={18} />
        <span className="max-w-36 truncate">{team}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-3" side="top">
        <ValidationTeamHoverContent {...props} />
      </HoverCardContent>
    </HoverCard>
  );
}

interface ValidationTeamChipGroupProps {
  label: string;
  teams: string[];
  role: ValidationTeamRole;
  year: number;
  ruleTarget?: string;
}

export function ValidationTeamChipGroup({
  label,
  teams,
  role,
  year,
  ruleTarget,
}: ValidationTeamChipGroupProps) {
  if (teams.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      {teams.map((team) => (
        <ValidationTeamChip
          key={team}
          team={team}
          role={role}
          year={year}
          ruleTarget={ruleTarget}
        />
      ))}
    </div>
  );
}
