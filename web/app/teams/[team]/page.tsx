import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { RunContextBar } from "@/components/layout/RunContextBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ResumeContent } from "@/components/team/ResumeContent";
import { getRunFile, NotFoundError } from "@/lib/data";
import type { TeamResumesPayload } from "@/lib/types";

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

function NotFound({ description }: { description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />
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

  const payload = await loadTeamResumes(run ?? null);

  if (!payload) {
    return (
      <NotFound description="The selection engine hasn't produced team-resumes.json for this run yet." />
    );
  }

  const resume = payload.teams[team];
  if (!resume) {
    return (
      <NotFound description={`${team} isn't in the tracked resume set for this run — it may be ranked outside the top 40 and out of the bubble picture.`} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />
      <ResumeContent resume={resume} variant="page" />
    </div>
  );
}
