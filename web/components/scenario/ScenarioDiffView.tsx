"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScenarioLabTerm } from "@/components/explain/ScenarioLabTerm";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import {
  formatDroppedOutLabel,
  formatMovedIntoFieldLabel,
  formatRankShiftsLabel,
  formatSeedChangesLabel,
} from "@/lib/displayLabels";
import { formatWeightsLabeled } from "@/lib/runDisplay";
import type {
  DiffTeam,
  RankMove,
  ScenarioDiff,
  SeedChange,
} from "@/lib/scenarioDiff";
import { teamName } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function Section({ title, hint, children, className, style }: SectionProps) {
  return (
    <section
      style={style}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border/60 bg-card px-5 py-4 duration-500 fill-mode-both",
        className,
      )}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TeamChip({ team, trailing }: { team: DiffTeam; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={24}
      />
      <div className="min-w-0 flex-1">
        <p className={teamName}>{team.team}</p>
        <p className="truncate text-xs text-muted-foreground">{team.conference}</p>
      </div>
      {trailing}
    </div>
  );
}

/** Signed movement badge — green for a gain, red for a drop, neutral for none. */
function DeltaBadge({ delta, unit }: { delta: number; unit?: string }) {
  if (delta === 0) {
    return (
      <Badge variant="chip-neutral" className="gap-0.5 tabular-nums">
        <Minus className="size-3" /> 0
      </Badge>
    );
  }
  const up = delta > 0;
  return (
    <Badge variant={up ? "chip-green" : "chip-red"} className="gap-0.5 tabular-nums">
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(delta)}
      {unit ? ` ${unit}` : ""}
    </Badge>
  );
}

function SeedRow({ change }: { change: SeedChange }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <TeamLogoTile
          team={change.team}
          logoUrl={change.logo_url}
          abbreviation={change.abbreviation}
          primaryColor={change.primary_color}
          size={22}
        />
        <span className={teamName}>{change.team}</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-sm tabular-nums text-muted-foreground">
        <span>#{change.base_seed ?? "—"}</span>
        <span className="text-muted-foreground/50">→</span>
        <span className="font-semibold text-foreground">#{change.scenario_seed ?? "—"}</span>
      </div>
      <DeltaBadge delta={change.delta} />
    </div>
  );
}

function RankRow({ move }: { move: RankMove }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <TeamLogoTile
          team={move.team}
          logoUrl={move.logo_url}
          abbreviation={move.abbreviation}
          primaryColor={move.primary_color}
          size={20}
        />
        <span className="truncate text-sm text-foreground">{move.team}</span>
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        #{move.base_rank} → #{move.scenario_rank}
      </span>
      <DeltaBadge delta={move.delta} />
    </div>
  );
}

function BubbleColumn({
  label,
  teams,
  tone,
}: {
  label: string;
  teams: Array<DiffTeam & { rank: number }>;
  tone: "in" | "out";
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-2 text-[11px] font-semibold uppercase tracking-wide",
          tone === "in" ? "text-tag-green-text" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      {teams.length === 0 ? (
        <p className="text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {teams.map((team) => (
            <li key={team.team} className="flex items-center gap-2">
              <span className="w-6 font-mono text-[11px] tabular-nums text-muted-foreground">
                #{team.rank}
              </span>
              <TeamLogoTile
                team={team.team}
                logoUrl={team.logo_url}
                abbreviation={team.abbreviation}
                primaryColor={team.primary_color}
                size={18}
              />
              <span className="truncate text-xs text-foreground">{team.team}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ScenarioDiffViewProps {
  diff: ScenarioDiff;
}

export function ScenarioDiffView({ diff }: ScenarioDiffViewProps) {
  const { summary } = diff;
  const fieldUnchanged = summary.moved_in === 0 && summary.moved_out === 0;
  let step = 0;
  const delay = () => ({ animationDelay: `${step++ * 60}ms` });

  return (
    <div className="flex flex-col gap-4">
      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={summary.moved_in ? "chip-green" : "chip-neutral"} className="gap-1">
          <ArrowUpRight className="size-3" />
          {formatMovedIntoFieldLabel(summary.moved_in)}
        </Badge>
        <Badge variant={summary.moved_out ? "chip-red" : "chip-neutral"} className="gap-1">
          <ArrowDownRight className="size-3" />
          {formatDroppedOutLabel(summary.moved_out)}
        </Badge>
        <Badge variant="chip-neutral">{formatSeedChangesLabel(summary.seed_changes)}</Badge>
        <Badge variant="chip-neutral">{formatRankShiftsLabel(summary.rank_changes)}</Badge>
      </div>

      {/* Field membership */}
      <Section
        title={<ScenarioLabTerm term="field_changes" className="text-sm font-semibold" />}
        hint="Teams entering or leaving the projected 12-team field under these weights."
        style={delay()}
      >
        {fieldUnchanged ? (
          <p className="text-sm text-muted-foreground">
            The same twelve teams make the field. Only their seeding shifts.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-tag-green-text">
                Moved in ({diff.moved_in.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {diff.moved_in.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  diff.moved_in.map((team) => (
                    <TeamChip
                      key={team.team}
                      team={team}
                      trailing={
                        <Badge variant="chip-green" className="tabular-nums">
                          #{team.seed}
                        </Badge>
                      }
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-tag-red-text">
                Dropped out ({diff.moved_out.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {diff.moved_out.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None</p>
                ) : (
                  diff.moved_out.map((team) => (
                    <TeamChip
                      key={team.team}
                      team={team}
                      trailing={
                        <Badge variant="chip-red" className="tabular-nums">
                          was #{team.seed}
                        </Badge>
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Seed changes */}
      {diff.seed_changes.length > 0 ? (
        <Section
          title={<ScenarioLabTerm term="seed_changes" className="text-sm font-semibold" />}
          hint="Teams in both fields whose seed line changed. A positive delta means a better (lower) seed."
          style={delay()}
        >
          <div className="divide-y divide-border/40">
            {diff.seed_changes.map((change) => (
              <SeedRow key={change.team} change={change} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Bubble */}
      <Section
        title={<ScenarioLabTerm term="bubble_movement" className="text-sm font-semibold" />}
        hint="Last four in and first four out, before and after the reweight."
        style={delay()}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-muted-foreground">Base</p>
            <BubbleColumn label="Last four in" teams={diff.bubble.base.last_four_in} tone="in" />
            <BubbleColumn label="First four out" teams={diff.bubble.base.first_four_out} tone="out" />
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-foreground">This scenario</p>
            <BubbleColumn label="Last four in" teams={diff.bubble.scenario.last_four_in} tone="in" />
            <BubbleColumn label="First four out" teams={diff.bubble.scenario.first_four_out} tone="out" />
          </div>
        </div>
      </Section>

      {/* Rank movers */}
      {diff.rank_movers.length > 0 ? (
        <Section
          title={<ScenarioLabTerm term="bracket_impact" className="text-sm font-semibold" />}
          hint="Largest full-board shifts under the simulated weights."
          style={delay()}
        >
          <div className="divide-y divide-border/40">
            {diff.rank_movers.map((move) => (
              <RankRow key={move.team} move={move} />
            ))}
          </div>
        </Section>
      ) : null}

      {/* Weights footer */}
      <p className="text-xs text-muted-foreground">
        <span className="text-foreground/80">Base weights:</span>{" "}
        {diff.base_weights ? formatWeightsLabeled(diff.base_weights) : "—"}
        <span className="mx-2 text-muted-foreground/50">·</span>
        <span className="text-foreground/80">Scenario weights:</span>{" "}
        {diff.scenario_weights ? formatWeightsLabeled(diff.scenario_weights) : "—"}
      </p>
    </div>
  );
}
