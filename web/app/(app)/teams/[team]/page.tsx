import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { RunHeader } from "@/components/layout/RunHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ResumeContent } from "@/components/team/ResumeContent";
import { getRunFile, NotFoundError } from "@/lib/data";
import { synthesizeSummaryResume } from "@/lib/synthesizeResume";
import type { RankingsPayload, TeamResumesPayload } from "@/lib/types";

interface TeamPageProps {
  params: Promise<{ team: string }>;
  searchParams: Promise<{ run?: string }>;
}

async function loadTeamResumes(
  stem: string | null,
): Promise<TeamResumesPayload | null> {
  try {
    return await getRunFile(stem, "team-resumes");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

async function loadRankings(stem: string | null): Promise<RankingsPayload | null> {
  try {
    return await getRunFile(stem, "rankings");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

function NotFound({ description }: { description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <RunHeader />
      <EmptyState
        icon={<SearchX className="h-5 w-5" />}
        title="Team not found"
        description={description}
        action={
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to rankings
          </Link>
        }
      />
    </div>
  );
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { team: encodedTeam } = await params;
  const { run } = await searchParams;
  const team = decodeURIComponent(encodedTeam);
  const stem = run ?? null;

  const [payload, rankings] = await Promise.all([
    loadTeamResumes(stem),
    loadRankings(stem),
  ]);

  const resume =
    payload?.teams[team] ??
    (() => {
      const row = rankings?.teams.find((t) => t.team === team);
      return row ? synthesizeSummaryResume(row) : null;
    })();

  if (!resume) {
    if (!payload && !rankings) {
      return (
        <NotFound description="The selection engine hasn't produced team-resumes.json for this run yet." />
      );
    }
    return (
      <NotFound description={`${team} is not in the rankings for this run.`} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RunHeader stem={stem} />
      <ResumeContent
        resume={resume}
        recordMeta={payload?.record_meta ?? rankings?.record_meta ?? null}
        variant="page"
      />
    </div>
  );
}
