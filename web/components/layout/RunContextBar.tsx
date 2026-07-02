import { Badge } from "@/components/ui/badge";
import { BadgeTooltip } from "@/components/explain/InfoTooltip";
import { RulesetBadge } from "@/components/team/RulesetBadge";
import { NewRunDialog } from "@/components/layout/NewRunDialog";
import { RunSwitcher } from "@/components/layout/RunSwitcher";
import { getRuns, NotFoundError } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { RunsPayload, RunSummary } from "@/lib/types";

async function loadRuns(): Promise<RunsPayload | null> {
  try {
    return await getRuns();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

interface RunContextBarProps {
  /** Run stem from the page's ?run= param; null/undefined = latest run. */
  stem?: string | null;
}

/** Season/week context header shared by every data page, with the run switcher. */
export async function RunContextBar({ stem }: RunContextBarProps) {
  const runs = await loadRuns();

  if (!runs) {
    // FirstRunGate normally catches this; belt-and-suspenders for direct hits.
    return (
      <div className="mb-8 rounded-xl bg-card px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          No run data yet. Run the pipeline to populate{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
            data/output/api/
          </code>
          .
        </p>
      </div>
    );
  }

  const currentStem = stem ?? runs.latest.stem;
  const run: RunSummary | undefined = runs.runs.find(
    (r) => r.stem === currentStem,
  );

  if (!run) {
    return (
      <div className="mb-8 rounded-xl bg-card px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Unknown run{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-foreground">
              {currentStem}
            </code>
            {" — "}pick one that exists.
          </p>
          <RunSwitcher
            runs={runs.runs}
            currentStem={runs.latest.stem}
            latestStem={runs.latest.stem}
          />
        </div>
      </div>
    );
  }

  const isLive = run.data_source === "cfbd";

  return (
    <div className="mb-8 rounded-xl bg-card px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{run.season} season</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              Week {run.week}
            </h2>
            <RulesetBadge ruleset={run.ruleset} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeTooltip badge={isLive ? "live_data" : "sample_data"}>
              <Badge variant={isLive ? "chip-red" : "chip-neutral"} tabIndex={0}>
                {isLive ? "Live CFBD data" : "Sample data"}
              </Badge>
            </BadgeTooltip>
            {run.has_bracket ? (
              <BadgeTooltip badge="bracket_ready">
                <Badge variant="chip-neutral" tabIndex={0}>
                  Bracket ready
                </Badge>
              </BadgeTooltip>
            ) : null}
            {runs.runs.length > 1 ? (
              <RunSwitcher
                runs={runs.runs}
                currentStem={currentStem}
                latestStem={runs.latest.stem}
              />
            ) : null}
            <NewRunDialog defaultYear={run.season} defaultWeek={run.week} />
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(run.generated_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
