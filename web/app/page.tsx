import { LayoutDashboard } from "lucide-react";
import { RunContextBar } from "@/components/layout/RunContextBar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { getRunFile, NotFoundError } from "@/lib/data";
import { formatScore } from "@/lib/format";
import type { FieldPayload } from "@/lib/types";

async function loadField(): Promise<
  { ok: true; data: FieldPayload } | { ok: false }
> {
  try {
    const data = await getRunFile(null, "field");
    return { ok: true, data };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false };
    throw err;
  }
}

export default async function DashboardPage() {
  const result = await loadField();

  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />

      <div>
        <h1 className="text-xl font-semibold text-foreground">Who&apos;s in?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The current 12-team field, at a glance.
        </p>
      </div>

      {result.ok ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Field size"
            value={result.data.field.length}
            sub="Teams in the CFP bracket"
          />
          <MetricCard
            label="Automatic bids"
            value={result.data.auto_bids.length}
            sub="Conference champions"
            tooltip="Teams that earned their spot by winning their conference championship."
          />
          <MetricCard
            label="At-large bids"
            value={result.data.at_large_bids.length}
            sub="Selected on overall resume"
            tooltip="Teams selected by the committee based on overall resume strength, not conference championship status."
          />
          <MetricCard
            label="Last team in"
            value={
              result.data.last_four_in[result.data.last_four_in.length - 1]
                ?.team ?? "—"
            }
            sub={`Composite ${formatScore(
              result.data.last_four_in[result.data.last_four_in.length - 1]
                ?.composite_score,
            )}`}
            tooltip="The lowest-seeded at-large team still inside the field."
          />
        </div>
      ) : (
        <ErrorState />
      )}

      <EmptyState
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Dashboard coming online"
        description="The full who's-in view — field grid, bubble tracker, and movement since last week — is under construction. This shell proves the data pipe end to end: run context, field counts, and scores above are all live from data/output/api/."
      />
    </div>
  );
}
