import { RunHeader } from "@/components/layout/RunHeader";
import { PageNavIcon } from "@/components/icons/PageNavIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { RankingTable } from "@/components/rankings/RankingTable";
import { ResumePredictiveScatter } from "@/components/charts/ResumePredictiveScatter";
import { getRunFile, NotFoundError } from "@/lib/data";
import type { RankingsPayload } from "@/lib/types";
import { pageDescription, pageTitle } from "@/lib/typography";

interface RankingsPageProps {
  searchParams: Promise<{ run?: string }>;
}

async function loadRankings(
  stem: string | null,
): Promise<RankingsPayload | null> {
  try {
    return await getRunFile(stem, "rankings");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function RankingsPage({
  searchParams,
}: RankingsPageProps) {
  const { run } = await searchParams;
  const stem = run ?? null;
  const rankings = await loadRankings(stem);

  return (
    <div className="flex flex-col gap-6">
      <RunHeader stem={stem} />
      <div>
        <h1 className={pageTitle}>Rankings</h1>
        <p className={pageDescription}>
          The full composite rankings, with resume, predictive, SOR, and SOS
          components. Click any team for its full resume and the model&apos;s
          selection case.
        </p>
      </div>

      {rankings ? (
        rankings.teams.length > 0 ? (
          <>
            <ResumePredictiveScatter teams={rankings.teams} />
            <RankingTable
              teams={rankings.teams}
              recordMeta={rankings.record_meta}
              season={rankings.season}
              week={rankings.week}
            />
          </>
        ) : (
          <EmptyState
            icon={<PageNavIcon href="/rankings" />}
            title="No teams ranked yet"
            description="This run's rankings.json has no teams."
          />
        )
      ) : (
        <EmptyState
          icon={<PageNavIcon href="/rankings" />}
          title="Rankings not available"
          description="The selection engine hasn't produced rankings.json for this run yet. Run the exporter, or seed fixtures for local development."
        />
      )}
    </div>
  );
}
