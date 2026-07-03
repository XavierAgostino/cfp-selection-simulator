import { EmptyState } from "@/components/common/EmptyState";
import { ScenarioLabWorkspace } from "@/components/scenario/ScenarioLabWorkspace";
import { getRuns, NotFoundError } from "@/lib/data";
import { isBaseRun } from "@/lib/runDisplay";
import type { RunsPayload } from "@/lib/types";

export const metadata = {
  title: "Scenario Lab | Selection Room",
  description:
    "Reweight the selection model and watch the projected field, seeds, and bubble respond.",
};

async function loadRuns(): Promise<RunsPayload | null> {
  try {
    return await getRuns();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function ScenarioLabPage() {
  const runs = await loadRuns();
  const baseRuns = runs?.runs.filter(isBaseRun) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Scenario Lab
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Change how much each component drives the composite, then re-run
          selection to compare against the base weights. Every result is a
          projected reordering under different assumptions, not a win probability.
        </p>
      </header>

      {runs && baseRuns.length > 0 ? (
        <ScenarioLabWorkspace runs={runs.runs} latestStem={runs.latest.stem} />
      ) : (
        <EmptyState
          title="No base runs to fork"
          description="Scenario Lab reweights an existing base run. Generate at least one run first, then come back to explore what-ifs."
        />
      )}
    </div>
  );
}
