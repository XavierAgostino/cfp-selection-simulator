"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { BracketGame } from "@/components/bracket/BracketGame";
import { BubbleCutlineChart } from "@/components/charts/BubbleCutlineChart";
import {
  STATUS_LABEL,
} from "@/components/charts/SelectionStabilityBoard";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { Badge } from "@/components/ui/badge";
import { formatScore, formatPct } from "@/lib/format";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingPanelTitle } from "@/lib/landing-typography";
import { teamName } from "@/lib/typography";
import type { SelectionStabilityTeam, TeamSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

function PanelChrome({
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

function FieldRow({ team }: { team: TeamSlot }) {
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

function StabilityRow({ team }: { team: SelectionStabilityTeam }) {
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

export function LandingProductBoard({ data }: { data: LandingPreviewData }) {
  const byes = data.field.field.filter((team) => team.is_bye);
  const firstRound = data.field.field.filter((team) => !team.is_bye);
  const pods = data.bracket.pods.slice(0, 2);
  const resume = data.featuredResume;
  const bubbleTeams =
    data.sensitivity?.teams.filter((team) => team.status === "bubble").slice(0, 3) ?? [];
  const reasons =
    resume.selection_case?.reasons?.length ? resume.selection_case.reasons : resume.why_in;
  const concerns =
    resume.selection_case?.concerns?.length ? resume.selection_case.concerns : resume.concerns;

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[1200px]">
      <div
        className="pointer-events-none absolute -inset-2 rounded-2xl bg-accent-gold/[0.06] blur-xl sm:-inset-4 sm:rounded-3xl sm:bg-accent-gold/[0.09] sm:blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-xl border border-border/90 bg-card shadow-board sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border bg-surface-raised/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/selection-room-icon-128.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <div>
              <p className={landingPanelTitle}>Selection Room</p>
              <p className="text-xs text-muted-foreground">Live analysis workspace</p>
            </div>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {data.seasonLabel}
          </span>
        </div>

        <div className="grid min-w-0 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-2 lg:p-5">
          <PanelChrome title="Projected field" eyebrow="Dashboard">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-tag-gold-dot" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-tag-gold-text">
                First-round byes
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {byes.map((team) => (
                <FieldRow key={team.team} team={team} />
              ))}
            </div>
            <div className="mt-3 mb-2 flex items-center gap-2 border-t border-border pt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First-round games
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {firstRound.slice(0, 4).map((team) => (
                <FieldRow key={team.team} team={team} />
              ))}
            </div>
          </PanelChrome>

          <PanelChrome title="Selection case" eyebrow="Team resume">
            <div className="flex items-start gap-3">
              <TeamLogoTile
                team={resume.team}
                logoUrl={resume.logo_url}
                abbreviation={resume.abbreviation}
                primaryColor={resume.primary_color}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">{resume.team}</p>
                <p className="text-sm text-muted-foreground">
                  #{resume.rank} · {resume.conference}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <BidBadge bidType={resume.bid_type} />
                  <SeedBadge seed={resume.seed} isBye={(resume.seed ?? 99) <= 4} />
                </div>
              </div>
            </div>
            {reasons.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {reasons.slice(0, 2).map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {concerns.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {concerns.slice(0, 1).map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-foreground/90">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </PanelChrome>

          <PanelChrome title="Bracket path" eyebrow="Bracket">
            <div className="grid gap-3 sm:grid-cols-2">
              {pods.map((pod) => (
                <BracketGame key={pod.pod_id} pod={pod} />
              ))}
            </div>
          </PanelChrome>

          <PanelChrome title="Selection stability" eyebrow="Scenario Lab">
            {data.sensitivity ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {data.sensitivity.n_scenarios.toLocaleString()} weight perturbations · resume{" "}
                  {Math.round(data.sensitivity.perturbation_spec.base_weights.resume * 100)}% base
                </p>
                {bubbleTeams.length > 0 ? (
                  bubbleTeams.map((team) => <StabilityRow key={team.team} team={team} />)
                ) : (
                  data.sensitivity.teams.slice(10, 13).map((team) => (
                    <StabilityRow key={team.team} team={team} />
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Run sensitivity analysis to preview weight stress tests.</p>
            )}
          </PanelChrome>

          <PanelChrome title="Bubble cutline" eyebrow="Bubble watch" className="lg:col-span-2">
            <BubbleCutlineChart
              lastFourIn={data.field.last_four_in}
              firstFourOut={data.field.first_four_out}
              variant="mini"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Last in
                </p>
                {data.field.last_four_in.slice(-2).map((team) => (
                  <FieldRow key={team.team} team={team} />
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  First out
                </p>
                {data.field.first_four_out.slice(0, 2).map((team) => (
                  <FieldRow key={team.team} team={team} />
                ))}
              </div>
            </div>
          </PanelChrome>
        </div>
      </div>
    </div>
  );
}
