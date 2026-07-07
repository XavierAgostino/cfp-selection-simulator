import { RunHeader } from "@/components/layout/RunHeader";
import { PageNavIcon } from "@/components/icons/PageNavIcon";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProjectedFieldPanel } from "@/components/dashboard/ProjectedFieldPanel";
import { FirstRoundMatchups } from "@/components/dashboard/FirstRoundMatchups";
import { BubbleSnapshotStrip } from "@/components/dashboard/BubbleSnapshotStrip";
import { CommitteeSnapshotCard } from "@/components/committee/CommitteeSnapshotCard";
import { CommitteeTendenciesTeaser } from "@/components/dashboard/CommitteeTendenciesTeaser";
import { EmptyState } from "@/components/common/EmptyState";
import { getRunFile, NotFoundError } from "@/lib/data";
import { loadRevealedPreferences } from "@/lib/revealedPreferences";
import { formatScore } from "@/lib/format";
import type {
  BracketPayload,
  CommitteeComparisonPayload,
  FieldPayload,
} from "@/lib/types";
import { pageDescription, pageTitle } from "@/lib/typography";

interface DashboardPageProps {
  searchParams: Promise<{ run?: string }>;
}

async function loadField(stem: string | null): Promise<FieldPayload | null> {
  try {
    return await getRunFile(stem, "field");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

async function loadBracket(stem: string | null): Promise<BracketPayload | null> {
  try {
    return await getRunFile(stem, "bracket");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** Optional: only present when the season has published committee rankings. */
async function loadCommittee(
  stem: string | null,
): Promise<CommitteeComparisonPayload | null> {
  try {
    return await getRunFile(stem, "committee");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { run } = await searchParams;
  const stem = run ?? null;
  const [field, bracket, committee, revealed] = await Promise.all([
    loadField(stem),
    loadBracket(stem),
    loadCommittee(stem),
    loadRevealedPreferences(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RunHeader stem={stem} />

      <div>
        <h1 className={pageTitle}>Who&apos;s in?</h1>
        <p className={pageDescription}>
          The current 12-team field, at a glance.
        </p>
      </div>

      {field ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Field size"
              value={field.field.length}
              sub="Teams in the CFP bracket"
            />
            <MetricCard
              label="Automatic bids"
              value={field.auto_bids.length}
              sub="Conference champions"
              explainBadge="auto"
            />
            <MetricCard
              label="At-large bids"
              value={field.at_large_bids.length}
              sub="Selected on overall resume"
              explainBadge="at_large"
            />
            <MetricCard
              label="Last team in"
              value={field.last_four_in.at(-1)?.team ?? "—"}
              sub={`Composite ${formatScore(field.last_four_in.at(-1)?.composite_score)}`}
              explainMetric="cut_line"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[7fr_5fr]">
            <ProjectedFieldPanel field={field.field} />
            <div className="flex flex-col gap-4">
              <FirstRoundMatchups
                games={bracket ? bracket.rounds.first_round : null}
              />
              {committee ? (
                <CommitteeSnapshotCard data={committee} stem={stem} />
              ) : null}
              {revealed ? (
                <CommitteeTendenciesTeaser takeaway={revealed.disclaimer} />
              ) : null}
            </div>
          </div>

          <BubbleSnapshotStrip
            lastFourIn={field.last_four_in}
            firstFourOut={field.first_four_out}
          />
        </>
      ) : (
        <EmptyState
          icon={<PageNavIcon href="/dashboard" />}
          title="No field data for this run"
          description="The selection engine hasn't produced field.json yet. Run the pipeline, then refresh."
        />
      )}
    </div>
  );
}
