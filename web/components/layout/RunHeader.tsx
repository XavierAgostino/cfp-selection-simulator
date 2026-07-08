import { ChevronDown, Info, Lock, TriangleAlert } from "lucide-react";

import { RunHeaderActions } from "@/components/layout/RunHeaderActions";
import { RunFreshness } from "@/components/layout/RunFreshness";
import { RunSourceBadge } from "@/components/layout/RunSourceBadge";
import { RunSwitcher } from "@/components/layout/RunSwitcher";
import { Card } from "@/components/ui/card";
import { getRuns, NotFoundError } from "@/lib/data";
import {
  formatWeightsLabeled,
  isBaseRun,
  runConfigLabel,
  runFreshness,
  runHeaderSubline,
  runHeaderTitle,
  runSourceBadge,
} from "@/lib/runDisplay";
import { resolveSeasonPhase } from "@/lib/seasonPhase";
import type { RunsPayload, RunSummary } from "@/lib/types";
import { bodyMuted } from "@/lib/typography";
import { cn } from "@/lib/utils";

async function loadRuns(): Promise<RunsPayload | null> {
  try {
    return await getRuns();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

interface RunHeaderProps {
  /** Run stem from the page's ?run= param; null/undefined = latest run. */
  stem?: string | null;
}

/** Run identity, assumptions, and actions — shared across every data page. */
export async function RunHeader({ stem }: RunHeaderProps) {
  const runs = await loadRuns();

  if (!runs) {
    return (
      <Card className="mb-8 gap-0 px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          No run data yet. Run the pipeline to populate{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            data/output/api/
          </code>
          .
        </p>
      </Card>
    );
  }

  const currentStem = stem ?? runs.latest.stem;
  const run: RunSummary | undefined = runs.runs.find(
    (r) => r.stem === currentStem,
  );

  if (!run) {
    const fallback = runs.runs.find((r) => r.stem === runs.latest.stem) ?? runs.runs[0];
    return (
      <Card className="mb-8 gap-0 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Unknown run. Pick one that exists.
          </p>
          {fallback ? (
            <RunHeaderActions
              initialRuns={runs}
              currentRun={fallback}
              currentStem={runs.latest.stem}
            />
          ) : (
            <RunSwitcher
              runs={runs.runs}
              currentStem={runs.latest.stem}
              latestStem={runs.latest.stem}
            />
          )}
        </div>
      </Card>
    );
  }

  const phase = resolveSeasonPhase();

  // Off-season, a base run isn't a "live" projection anymore — it's the season's
  // settled final field. Reframe the badge (amber "final" tone) so the reader
  // isn't told stale committee-era data is live. Scenarios keep their identity.
  const offSeasonFinal = phase.phase === "offseason" && isBaseRun(run);
  const badge = offSeasonFinal
    ? {
        tone: "final" as const,
        label: `Final ${run.season} projection`,
        description: `Selection Room's projection built from final ${run.season} regular-season data. The model's field can differ from the committee's actual selections. Live weekly projections return when the ${run.season + 1} committee rankings begin.`,
      }
    : runSourceBadge(run);
  const freshness = runFreshness(run);
  const isSample = badge.tone === "sample";
  const ContextIcon = isSample ? TriangleAlert : Info;

  return (
    <Card className="mb-8 gap-0 px-5 py-5 sm:px-6">
      {/* Top row: dominant source signal (left), actions (right, stacks on mobile) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <RunSourceBadge tone={badge.tone} label={badge.label} />
        {phase.phase === "live" ? (
          <RunHeaderActions
            initialRuns={runs}
            currentRun={run}
            currentStem={currentStem}
          />
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
            {runs.runs.length > 1 ? (
              <RunSwitcher
                runs={runs.runs}
                currentStem={currentStem}
                latestStem={runs.latest.stem}
              />
            ) : null}
            <RunAnalysisLocked nextOpen={phase.nextOpen} />
          </div>
        )}
      </div>

      {/* Identity: what this run is, in plain terms */}
      <div className="mt-4 min-w-0">
        <p className="text-xl font-semibold tracking-tight text-balance text-foreground">
          {runHeaderTitle(run)}
        </p>
        <p className={`${bodyMuted} mt-1`}>{runHeaderSubline(run)}</p>
      </div>

      {/* Context / caveat, tied to the source badge above */}
      <div
        className={cn(
          "mt-3 flex max-w-prose items-start gap-2 text-xs leading-5",
          isSample ? "text-tag-gold-text" : "text-muted-foreground",
        )}
      >
        <ContextIcon className="mt-px size-3.5 shrink-0" aria-hidden />
        <p>{badge.description}</p>
      </div>

      {/* Quiet model details — weights, config, freshness behind a disclosure */}
      <details className="group mt-4 border-t border-border/50 pt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          Model details
          <ChevronDown
            className="size-3.5 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground/80">Weights</span>{" "}
            <span className="tabular-nums">{formatWeightsLabeled(run.weights)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-5">
            <RunFreshness freshness={freshness} />
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="tabular-nums">{runConfigLabel(run)}</span>
          </div>
        </div>
      </details>
    </Card>
  );
}

/**
 * Off-season stand-in for the live "Run Analysis" action. The action isn't
 * broken — there's simply no live field to project until the committee starts
 * ranking. This states that plainly and names the reopen date, and because
 * RunHeader is a server component that recomputes each request, it flips itself
 * back to the live control on the calendar with no redeploy. The standby dot
 * (a muted-amber pulse) signals "armed, waiting" rather than "disabled".
 */
function RunAnalysisLocked({ nextOpen }: { nextOpen: Date }) {
  const opensLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(nextOpen);

  return (
    <div className="flex flex-col items-start gap-1.5 lg:items-end">
      <span
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
        title="Live analysis reopens when the committee's first rankings post."
      >
        <Lock className="size-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
        Live analysis opens in season
      </span>
      <span className="inline-flex items-center gap-1.5 pr-0.5 text-[11px] text-muted-foreground/70">
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-tag-gold-dot opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-tag-gold-dot" />
        </span>
        Projections resume {opensLabel}
      </span>
    </div>
  );
}

/** @deprecated Use RunHeader — kept for incremental migration. */
export const RunContextBar = RunHeader;
