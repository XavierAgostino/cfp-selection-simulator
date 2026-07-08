import Image from "next/image";
import { BubbleCutlineChart } from "@/components/charts/BubbleCutlineChart";
import { FieldRow } from "@/components/landing/landing-preview-primitives";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { formatScore } from "@/lib/format";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingPanelTitle } from "@/lib/landing-typography";
import { teamName } from "@/lib/typography";
import type { TeamSlot } from "@/lib/types";

/** Compact logo + name + score row, sized for the narrow bubble panel. */
function MiniTeamRow({ team }: { team: TeamSlot }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={20}
      />
      <span className={`${teamName} min-w-0 flex-1 truncate`}>{team.team}</span>
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {formatScore(team.composite_score)}
      </span>
    </div>
  );
}

/**
 * The hero's signature product moment: one cinematic mockup, wide, in faux app
 * chrome. On desktop it pairs the projected field (left) with a bubble snapshot
 * (right) so it reads as a real workspace, not an embedded table — still one
 * cohesive visual, not the old five-panel dump. On mobile the panels stack.
 */
export function LandingHeroVisual({ data }: { data: LandingPreviewData }) {
  const byes = data.field.field.filter((team) => team.is_bye);
  const firstRound = data.field.field.filter((team) => !team.is_bye);

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-5xl">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-accent-gold/[0.09] blur-3xl sm:-inset-10"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-card shadow-board">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent-gold/50 to-transparent"
          aria-hidden
        />
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
            {data.seasonLabel} · Base Projection
          </span>
        </div>

        <div className="grid min-w-0 lg:grid-cols-[1.5fr_1fr]">
          {/* Projected field */}
          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
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

            <div className="mt-4 mb-3 flex items-center gap-2 border-t border-border pt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First-round games
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {firstRound.map((team) => (
                <FieldRow key={team.team} team={team} />
              ))}
            </div>
          </div>

          {/* Bubble snapshot — the supporting panel */}
          <div className="min-w-0 border-t border-border bg-background/40 p-4 sm:p-6 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-tag-red-dot" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bubble watch
              </span>
            </div>
            <BubbleCutlineChart
              lastFourIn={data.field.last_four_in}
              firstFourOut={data.field.first_four_out}
              variant="mini"
            />
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
              <p className="mb-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-tag-gold-text">
                Last in
              </p>
              {data.field.last_four_in.slice(-2).map((team) => (
                <MiniTeamRow key={team.team} team={team} />
              ))}
              <p className="mb-0.5 mt-2 text-[0.65rem] font-semibold uppercase tracking-wide text-tag-red-text">
                First out
              </p>
              {data.field.first_four_out.slice(0, 2).map((team) => (
                <MiniTeamRow key={team.team} team={team} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
