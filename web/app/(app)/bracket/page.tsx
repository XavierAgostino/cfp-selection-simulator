import { RunHeader } from "@/components/layout/RunHeader";
import { PageNavIcon } from "@/components/icons/PageNavIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { BracketViewer } from "@/components/bracket/BracketViewer";
import { getRunFile, NotFoundError } from "@/lib/data";
import type { BracketPayload } from "@/lib/types";
import { pageDescription, pageTitle } from "@/lib/typography";

interface BracketPageProps {
  searchParams: Promise<{ run?: string }>;
}

async function loadBracket(stem: string | null): Promise<BracketPayload | null> {
  try {
    return await getRunFile(stem, "bracket");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function BracketPage({ searchParams }: BracketPageProps) {
  const { run } = await searchParams;
  const stem = run ?? null;
  const bracket = await loadBracket(stem);

  return (
    <div className="flex flex-col gap-6">
      <RunHeader stem={stem} />
      <div>
        <h1 className={pageTitle}>Bracket</h1>
        <p className={pageDescription}>
          The full 12-team playoff bracket, pod by pod.
        </p>
      </div>
      {bracket ? (
        <BracketViewer bracket={bracket} />
      ) : (
        <EmptyState
          icon={<PageNavIcon href="/bracket" />}
          title="Bracket not available for this run"
          description="This run was rankings-only, or the bracket export hasn't run yet. Re-run the pipeline with bracket generation enabled."
        />
      )}
    </div>
  );
}
