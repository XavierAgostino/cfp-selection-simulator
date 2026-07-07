import { Terminal } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { CommitteeComparisonPanel } from "@/components/committee/CommitteeComparisonPanel";
import { CommitteeTakeawayCard } from "@/components/committee/CommitteeTakeawayCard";
import { CommitteeTendenciesCard } from "@/components/validation/CommitteeTendenciesCard";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";
import { getRunFile, getValidationData, NotFoundError } from "@/lib/data";
import { finalFit2025, loadRevealedPreferences } from "@/lib/revealedPreferences";
import { pageDescription, pageTitle, sectionTitle } from "@/lib/typography";
import type {
  CommitteeComparisonPayload,
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
  ValidationPayload,
} from "@/lib/types";

export const metadata = {
  title: "Model Validation | Selection Room",
  description:
    "How the transparent, rules-based model compares to the real CFP Selection Committee across historical seasons.",
};

interface ValidationPageProps {
  searchParams: Promise<{ run?: string; debug?: string }>;
}

async function loadValidation(): Promise<ValidationPayload | null> {
  return getValidationData();
}

/**
 * Hidden research card, only behind ?debug=revealed and only when the local
 * research artifact passes the fail-closed loader. Renders nothing otherwise.
 */
async function loadRevealed(
  debug: string | undefined,
): Promise<{
  payload: RevealedPreferencesPayload;
  entry: RevealedPreferencesEntry;
} | null> {
  if (debug !== "revealed") return null;
  const payload = await loadRevealedPreferences();
  if (!payload) return null;
  const entry = finalFit2025(payload);
  if (!entry) return null;
  return { payload, entry };
}

/** Per-run committee comparison; absent for seasons without committee data. */
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

export default async function ValidationPage({ searchParams }: ValidationPageProps) {
  const { run, debug } = await searchParams;
  const stem = run ?? null;
  const [data, committee, revealed] = await Promise.all([
    loadValidation(),
    loadCommittee(stem),
    loadRevealed(debug),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className={pageTitle}>Model Validation</h1>
        <p className={pageDescription}>
          The honesty layer: how well the model reproduces the committee&apos;s
          rankings, picks the right field under each era&apos;s rules, and scores
          completed games. Measured against history, not asserted.
        </p>
      </header>

      {revealed ? (
        <section className="flex flex-col gap-3">
          <CommitteeTendenciesCard
            payload={revealed.payload}
            entry={revealed.entry}
          />
        </section>
      ) : null}

      {committee ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className={sectionTitle}>This run vs the committee</h2>
            <p className="text-sm text-muted-foreground">
              The current run&apos;s projection against the committee&apos;s
              published final rankings for {committee.season}. Overlap measures
              alignment with the committee, not whether the committee was
              right.
            </p>
          </div>
          <CommitteeTakeawayCard data={committee} />
          <CommitteeComparisonPanel data={committee} />
        </section>
      ) : null}

      {data ? (
        <section className="flex flex-col gap-3">
          {committee ? (
            <div>
              <h2 className={sectionTitle}>Historical validation</h2>
              <p className="text-sm text-muted-foreground">
                The same comparison run across every completed season with
                committee data.
              </p>
            </div>
          ) : null}
          <ValidationDashboard data={data} />
        </section>
      ) : (
        <EmptyState
          title="No validation run yet"
          description="Validation replays historical seasons and scores the model against the real committee. Run it over the seasons you have data for, then reload this page."
          action={
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
              <Terminal className="size-3.5 text-muted-foreground" />
              sroom validate --years 2014:2024
            </div>
          }
        />
      )}
    </div>
  );
}
