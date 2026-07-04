import { Badge } from "@/components/ui/badge";
import { BadgeTooltip } from "@/components/explain/InfoTooltip";
import { RulesetBadge } from "@/components/team/RulesetBadge";
import { RunHeaderActions } from "@/components/layout/RunHeaderActions";
import { RunSwitcher } from "@/components/layout/RunSwitcher";
import { getRuns, NotFoundError } from "@/lib/data";
import {
  dataSourceLabel,
  formatRulesetShort,
  formatWeightsLabeled,
  isBaseRun,
  isLiveRun,
  runDetailsLine,
  runPrimaryLabel,
  runProjectionSubtitle,
  SAMPLE_DEMO_HELPER,
} from "@/lib/runDisplay";
import { formatRunCapabilityLabel, formatRunKindLabel } from "@/lib/displayLabels";
import type { RunsPayload, RunSummary } from "@/lib/types";
import { bodyMuted } from "@/lib/typography";

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
      <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          No run data yet. Run the pipeline to populate{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            data/output/api/
          </code>
          .
        </p>
      </header>
    );
  }

  const currentStem = stem ?? runs.latest.stem;
  const run: RunSummary | undefined = runs.runs.find(
    (r) => r.stem === currentStem,
  );

  if (!run) {
    const fallback = runs.runs.find((r) => r.stem === runs.latest.stem) ?? runs.runs[0];
    return (
      <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-4 sm:px-6">
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
      </header>
    );
  }

  const isLive = isLiveRun(run);
  const isSample = !isLive;
  const isScenario = !isBaseRun(run);

  return (
    <header className="mb-8 rounded-xl border border-border/60 bg-card px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* LEFT + MIDDLE: run identity and assumptions */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {runPrimaryLabel(run)}
            </p>
            <p className={`${bodyMuted} mt-0.5`}>
              {isScenario
                ? runProjectionSubtitle(run)
                : `${dataSourceLabel(run)} · ${formatRulesetShort(run.ruleset)} model projection`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isScenario ? (
              <Badge variant="chip-neutral">{formatRunKindLabel(true)}</Badge>
            ) : (
              <Badge variant="chip-neutral">{formatRunKindLabel(false)}</Badge>
            )}
            <RulesetBadge ruleset={run.ruleset} />
            <BadgeTooltip badge={isLive ? "live_data" : "sample_data"}>
              <Badge variant="chip-neutral" tabIndex={0} className="cursor-help">
                {dataSourceLabel(run)}
              </Badge>
            </BadgeTooltip>
            {run.has_bracket ? (
              <BadgeTooltip badge="bracket_ready">
                <Badge variant="chip-neutral" tabIndex={0}>
                  {formatRunCapabilityLabel("bracket")}
                </Badge>
              </BadgeTooltip>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/80">Weights:</span>{" "}
            {formatWeightsLabeled(run.weights)}
          </p>

          <p className="text-xs leading-5 text-muted-foreground/90">
            {runDetailsLine(run)}
          </p>

          {isSample ? (
            <p className="text-xs text-muted-foreground">{SAMPLE_DEMO_HELPER}</p>
          ) : null}
        </div>

        {/* RIGHT: actions */}
        <RunHeaderActions
          initialRuns={runs}
          currentRun={run}
          currentStem={currentStem}
        />
      </div>
    </header>
  );
}

/** @deprecated Use RunHeader — kept for incremental migration. */
export const RunContextBar = RunHeader;
