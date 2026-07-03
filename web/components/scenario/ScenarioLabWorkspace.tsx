"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  FlaskConical,
  LoaderCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeightSliders } from "@/components/scenario/WeightSliders";
import { ScenarioDiffView } from "@/components/scenario/ScenarioDiffView";
import { ScenarioLabTerm } from "@/components/explain/ScenarioLabTerm";
import { InfoTooltip } from "@/components/explain/InfoTooltip";
import { SCENARIO_LAB_EXPLANATIONS } from "@/lib/scenarioLabExplain";
import { formatScenarioChipLabel } from "@/lib/displayLabels";
import { useScenarioRun } from "@/components/scenario/useScenarioRun";
import { isBaseRun } from "@/lib/runDisplay";
import type { RunCapabilities } from "@/lib/runJob";
import type { ScenarioDiff } from "@/lib/scenarioDiff";
import {
  DEFAULT_PERCENTS,
  percentsMatchBase,
  percentsToWeights,
  weightsScenarioId,
  type WeightPercents,
} from "@/lib/scenarioWeights";
import type { RunSummary } from "@/lib/types";

interface ScenarioLabWorkspaceProps {
  runs: RunSummary[];
  latestStem: string;
}

async function fetchDiff(baseStem: string, scenarioStem: string): Promise<ScenarioDiff> {
  const res = await fetch(
    `/api/scenario/diff?base=${encodeURIComponent(baseStem)}&scenario=${encodeURIComponent(scenarioStem)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const code = await res
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => undefined);
    throw new Error(code ?? "diff_failed");
  }
  return (await res.json()) as ScenarioDiff;
}

export function ScenarioLabWorkspace({ runs, latestStem }: ScenarioLabWorkspaceProps) {
  const baseRuns = React.useMemo(() => runs.filter(isBaseRun), [runs]);

  const [baseStem, setBaseStem] = React.useState<string>(() => {
    if (baseRuns.some((r) => r.stem === latestStem)) return latestStem;
    return baseRuns[0]?.stem ?? "";
  });
  const [percents, setPercents] = React.useState<WeightPercents>(DEFAULT_PERCENTS);
  const [diff, setDiff] = React.useState<ScenarioDiff | null>(null);
  const [diffError, setDiffError] = React.useState<string | null>(null);
  const [diffLoading, setDiffLoading] = React.useState(false);
  const [capabilities, setCapabilities] = React.useState<RunCapabilities | null>(null);

  const baseRun = baseRuns.find((r) => r.stem === baseStem);
  const scenarioWeights = percentsToWeights(percents);
  const scenarioId = weightsScenarioId(scenarioWeights);
  const matchesBase = percentsMatchBase(percents);
  const predictedStem = baseRun ? `${baseRun.run_id}__${scenarioId}` : "";

  const scenarioRuns = React.useMemo(
    () => runs.filter((r) => baseRun && r.run_id === baseRun.run_id && !isBaseRun(r)),
    [runs, baseRun],
  );
  const existingMatch = scenarioRuns.find((r) => r.stem === predictedStem);

  const loadDiff = React.useCallback(
    async (scenarioStem: string) => {
      if (!baseRun) return;
      setDiffLoading(true);
      setDiffError(null);
      try {
        setDiff(await fetchDiff(baseRun.stem, scenarioStem));
      } catch (err) {
        setDiff(null);
        setDiffError(err instanceof Error ? err.message : "diff_failed");
      } finally {
        setDiffLoading(false);
      }
    },
    [baseRun],
  );

  const run = useScenarioRun(loadDiff);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/run/capabilities", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RunCapabilities | null) => {
        if (!cancelled && data) setCapabilities(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const generationEnabled = capabilities?.run_generation_enabled ?? false;
  const busy = run.running || diffLoading;

  function launchScenario() {
    if (!baseRun || matchesBase) return;
    run.launch({
      season: baseRun.season,
      week: baseRun.week,
      data_source: baseRun.data_source,
      weights: scenarioWeights,
    });
  }

  const resultStem = diff?.scenario_stem ?? run.stem;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ---- Control panel ------------------------------------------------ */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ScenarioLabTerm term="base_run" className="normal-case" />
            </label>
            <Select value={baseStem} onValueChange={(v) => v && setBaseStem(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a base run" />
              </SelectTrigger>
              <SelectContent>
                {baseRuns.map((r) => (
                  <SelectItem key={r.stem} value={r.stem}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <WeightSliders percents={percents} onChange={setPercents} disabled={run.running} />

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/40 pt-4">
            <div className="flex items-center gap-2">
              <ScenarioLabTerm term="scenario" className="text-xs normal-case" />
              <InfoTooltip
                title={SCENARIO_LAB_EXPLANATIONS.config_hash.label}
                content={SCENARIO_LAB_EXPLANATIONS.config_hash.description}
              >
                <Badge
                  variant={matchesBase ? "chip-neutral" : "chip-gold"}
                  className="cursor-help font-mono"
                >
                  {formatScenarioChipLabel(scenarioId, { matchesBase })}
                </Badge>
              </InfoTooltip>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setPercents(DEFAULT_PERCENTS)}
              disabled={matchesBase || run.running}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {existingMatch ? (
              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => loadDiff(existingMatch.stem)}
                disabled={busy}
              >
                {diffLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <FlaskConical className="size-4" />
                )}
                View this scenario
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full gap-2"
                onClick={launchScenario}
                disabled={busy || matchesBase || !generationEnabled}
              >
                {run.running ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {run.running ? "Simulating…" : "Run scenario"}
              </Button>
            )}

            {matchesBase ? (
              <p className="text-xs text-muted-foreground">
                Adjust one or more weights to create a scenario. Base weights match
                the current run, so there is nothing to compare yet.
              </p>
            ) : null}
            {!generationEnabled && capabilities !== null && !existingMatch ? (
              <p className="text-xs text-muted-foreground">
                This deployment can open existing scenarios, but cannot create new
                ones.
              </p>
            ) : null}
          </div>
        </div>

        {/* Compare an already-generated scenario */}
        {scenarioRuns.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Saved scenarios
            </p>
            <ul className="flex flex-col gap-1">
              {scenarioRuns.map((r) => (
                <li key={r.stem}>
                  <button
                    type="button"
                    onClick={() => loadDiff(r.stem)}
                    disabled={busy}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50 disabled:opacity-50"
                  >
                    <span className="truncate text-foreground">{r.label}</span>
                    <Badge variant="chip-neutral" className="font-mono text-[10px]">
                      {r.scenario_id}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ---- Results ------------------------------------------------------ */}
      <div className="min-w-0">
        {run.phase === "failed" ? (
          <div className="rounded-xl border border-tag-red-border bg-tag-red-bg/40 px-5 py-4 text-sm text-tag-red-text">
            {run.error}
          </div>
        ) : null}

        {run.running ? (
          <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Simulating the {scenarioId} scenario: reranking, reselecting, reseeding…
            </div>
            {run.logLines.length > 0 ? (
              <pre className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {run.logLines.join("\n")}
              </pre>
            ) : null}
          </div>
        ) : null}

        {diffError ? (
          <div className="rounded-xl border border-tag-red-border bg-tag-red-bg/40 px-5 py-4 text-sm text-tag-red-text">
            Could not load the comparison ({diffError}).
          </div>
        ) : null}

        {diff && !run.running ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {baseRun?.label} · scenario{" "}
                  <span className="font-mono text-base text-tag-gold-text">
                    {diff.scenario_weights ? weightsScenarioId(diff.scenario_weights) : ""}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Projected reordering versus the base weights. Simulated, not a probability.
                </p>
              </div>
              {resultStem ? (
                <Button variant="outline" size="sm" nativeButton={false} render={
                  <Link href={`/?run=${encodeURIComponent(resultStem)}`} className="gap-1.5">
                    <ExternalLink className="size-4" />
                    Open full run
                  </Link>
                } />
              ) : null}
            </div>
            <ScenarioDiffView diff={diff} />
          </div>
        ) : null}

        {!diff && !run.running && run.phase !== "failed" && !diffError ? (
          <div className="flex min-h-64 flex-col rounded-xl border border-border/60 bg-card px-6 py-8">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-base font-medium text-foreground">
                Reweight the model
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Shift how much the four components drive the composite, then run a
                scenario to compare against the base run.
              </p>
            </div>

            <div className="mx-auto mt-8 w-full max-w-md rounded-lg border border-border/60 bg-secondary/30 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                After running a scenario, this panel shows
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {(
                  [
                    "field_changes",
                    "seed_changes",
                    "bubble_movement",
                    "bracket_impact",
                  ] as const
                ).map((term) => (
                  <li key={term} className="text-sm text-muted-foreground">
                    <ScenarioLabTerm term={term} className="font-medium text-foreground" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
