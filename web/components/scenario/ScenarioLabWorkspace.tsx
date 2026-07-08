"use client";

import * as React from "react";
import Link from "next/link";
import {
  ExternalLink,
  FlaskConical,
  LoaderCircle,
  Play,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  matchingPreset,
  percentsMatchBase,
  percentsToWeights,
  SCENARIO_PRESETS,
  weightsScenarioId,
  type WeightPercents,
} from "@/lib/scenarioWeights";
import { cn } from "@/lib/utils";
import type { RunSummary } from "@/lib/types";
import { bodyMuted, sectionTitle } from "@/lib/typography";
import {
  canLaunchHostedRun,
  canLaunchLocalRun,
  hostedGenerationDisabledMessage,
  hostedRunDashboardUrl,
  isHostedCapabilities,
} from "@/lib/runApiClient";
import { SignInPanel } from "@/components/auth/SignInPanel";

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

/**
 * Named starting points for the sliders. Each preset is a hypothesis about
 * what a committee might value; picking one just sets the sliders, so it can
 * be tweaked further before launching.
 */
function ScenarioPresetChips({
  percents,
  onSelect,
  disabled,
}: {
  percents: WeightPercents;
  onSelect: (next: WeightPercents) => void;
  disabled?: boolean;
}) {
  const active = matchingPreset(percents);

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Presets
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIO_PRESETS.map((preset) => {
          const isActive = active?.id === preset.id;
          return (
            <InfoTooltip
              key={preset.id}
              title={preset.label}
              content={`${preset.description} (${preset.percents.resume}/${preset.percents.predictive}/${preset.percents.sor}/${preset.percents.sos})`}
              side="top"
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect({ ...preset.percents })}
                aria-pressed={isActive}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "border-foreground/30 bg-secondary font-semibold text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {preset.label}
              </button>
            </InfoTooltip>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {active
          ? active.description
          : "Custom weights. Presets are starting points; fine-tune with the sliders below."}
      </p>
    </div>
  );
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

  const run = useScenarioRun(loadDiff, capabilities);

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
  const hosted = isHostedCapabilities(capabilities);
  const requiresAuth =
    hosted && capabilities.requires_auth && !capabilities.authenticated;
  const activeJobId = capabilities?.active_job_id ?? null;
  const serverBusy = hosted && Boolean(activeJobId) && !run.running;
  const canLaunchNew = capabilities
    ? hosted
      ? canLaunchHostedRun(capabilities, run.running)
      : canLaunchLocalRun(capabilities, run.running)
    : false;
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

          <ScenarioPresetChips
            percents={percents}
            onSelect={setPercents}
            disabled={run.running}
          />

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
            {hosted && capabilities !== null ? (
              <SignInPanel capabilities={capabilities} next="/scenario" />
            ) : null}

            {serverBusy ? (
              <p className="text-xs text-muted-foreground">
                A hosted run is already in progress. Wait for it to finish before launching
                another scenario.
              </p>
            ) : null}

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
                disabled={busy || matchesBase || !canLaunchNew}
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
            {!canLaunchNew && capabilities !== null && !existingMatch && !matchesBase ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {hosted
                  ? !generationEnabled
                    ? hostedGenerationDisabledMessage(capabilities)
                    : requiresAuth
                      ? "Sign in with GitHub to launch a hosted scenario."
                      : serverBusy
                        ? "Another hosted run is already in progress."
                        : "Hosted scenario launch is unavailable right now."
                  : "This deployment can open existing scenarios, but cannot create new ones."}
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
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{run.error}</AlertDescription>
          </Alert>
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
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>
              Could not load the comparison ({diffError}).
            </AlertDescription>
          </Alert>
        ) : null}

        {diff && !run.running ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={sectionTitle}>
                  {baseRun?.label} · scenario{" "}
                  <span className="font-mono text-base tabular-nums text-tag-gold-text">
                    {diff.scenario_weights ? weightsScenarioId(diff.scenario_weights) : ""}
                  </span>
                </h2>
                <p className={bodyMuted}>
                  Projected reordering versus the base weights. Simulated, not a probability.
                </p>
              </div>
              {resultStem ? (
                <Button variant="outline" size="sm" nativeButton={false} render={
                  <Link
                    href={
                      hosted
                        ? hostedRunDashboardUrl(resultStem)
                        : `/?run=${encodeURIComponent(resultStem)}`
                    }
                    className="gap-1.5"
                  >
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
              <h2 className={sectionTitle}>
                Reweight the model
              </h2>
              <p className={`${bodyMuted} mt-2 max-w-md`}>
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
