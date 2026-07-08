import { Terminal } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { CommitteeComparisonPanel } from "@/components/committee/CommitteeComparisonPanel";
import { CommitteeTakeawayCard } from "@/components/committee/CommitteeTakeawayCard";
import { CommitteeTendenciesCard } from "@/components/validation/CommitteeTendenciesCard";
import { CommitteeTendenciesWeeklyTracker } from "@/components/validation/CommitteeTendenciesWeeklyTracker";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";
import { getRunFile, getValidationData, NotFoundError } from "@/lib/data";
import { finalFit2025, loadRevealedPreferences } from "@/lib/revealedPreferences";
import { latestWeeklySeason, loadRevealedWeekly } from "@/lib/revealedWeekly";
import { pageDescription, pageTitle, sectionTitle } from "@/lib/typography";
import type {
  CommitteeComparisonPayload,
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
  RevealedWeeklyPayload,
  RevealedWeeklySeason,
  ValidationPayload,
} from "@/lib/types";

export const metadata = {
  title: "Model Validation | Selection Room",
  description:
    "How the transparent, rules-based model compares to the real CFP Selection Committee across historical seasons.",
};

interface ValidationPageProps {
  searchParams: Promise<{ run?: string }>;
}

async function loadValidation(): Promise<ValidationPayload | null> {
  return getValidationData();
}

/**
 * Public Committee Tendencies card. Renders only when the committed research
 * artifact passes the fail-closed loader; renders nothing otherwise.
 */
async function loadRevealed(): Promise<{
  payload: RevealedPreferencesPayload;
  entry: RevealedPreferencesEntry;
} | null> {
  const payload = await loadRevealedPreferences();
  if (!payload) return null;
  const entry = finalFit2025(payload);
  if (!entry) return null;
  return { payload, entry };
}

/** Public weekly tracker; same fail-closed contract as the final-fit card. */
async function loadRevealedWeeklySeason(): Promise<{
  payload: RevealedWeeklyPayload;
  season: RevealedWeeklySeason;
} | null> {
  const payload = await loadRevealedWeekly();
  if (!payload) return null;
  const season = latestWeeklySeason(payload);
  if (!season) return null;
  return { payload, season };
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
  const { run } = await searchParams;
  const stem = run ?? null;
  const [data, committee, revealed, revealedWeekly] = await Promise.all([
    loadValidation(),
    loadCommittee(stem),
    loadRevealed(),
    loadRevealedWeeklySeason(),
  ]);

  // Sections in display order, proof-first: historical validation (measured
  // against every season) leads, the single-run comparison follows, and the
  // more experimental Committee Tendencies layer sits last. Only present
  // sections get an on-page anchor link.
  const sections = [
    { id: "historical-validation", label: "Historical validation", present: Boolean(data) },
    { id: "this-run", label: "This run vs the committee", present: Boolean(committee) },
    { id: "committee-tendencies", label: "Committee Tendencies", present: Boolean(revealed) },
  ].filter((section) => section.present);

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

      {sections.length > 1 ? (
        <nav
          aria-label="On this page"
          className="flex flex-wrap gap-1.5 border-b border-border pb-4 text-sm"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </nav>
      ) : null}

      {data ? (
        <section
          id="historical-validation"
          className="flex scroll-mt-24 flex-col gap-3"
        >
          <h2 className={sectionTitle}>Historical validation</h2>
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

      {committee ? (
        <section id="this-run" className="flex scroll-mt-24 flex-col gap-3">
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

      {revealed ? (
        <section
          id="committee-tendencies"
          className="flex scroll-mt-24 flex-col gap-3"
        >
          <h2 className={sectionTitle}>Committee Tendencies</h2>
          <CommitteeTendenciesCard
            payload={revealed.payload}
            entry={revealed.entry}
          />
          {revealedWeekly ? (
            <CommitteeTendenciesWeeklyTracker
              payload={revealedWeekly.payload}
              season={revealedWeekly.season}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
