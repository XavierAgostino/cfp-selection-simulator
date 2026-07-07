"use client";

import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { useTeamDrawer } from "@/components/team/TeamDrawerProvider";
import { buildTakeaway, classifyDisagreements } from "@/lib/committeeInsights";
import type {
  CommitteeComparisonPayload,
  CommitteeComparisonTeam,
} from "@/lib/types";
import { metricLabel } from "@/lib/typography";

/** Small tappable team reference that sits inside a sentence. */
function InlineTeamChip({ team }: { team: CommitteeComparisonTeam }) {
  const { openTeam } = useTeamDrawer();
  return (
    <button
      type="button"
      onClick={() => openTeam(team.team)}
      aria-label={`Open resume for ${team.team}`}
      className="inline-flex -translate-y-px items-center gap-1 rounded-md border border-border bg-secondary/60 px-1.5 py-px align-middle text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={12}
      />
      {team.team}
    </button>
  );
}

function joinChips(teams: CommitteeComparisonTeam[]) {
  return teams.map((t, i) => (
    <span key={t.team}>
      {i > 0 ? <span> and </span> : null}
      <InlineTeamChip team={t} />
    </span>
  ));
}

/**
 * The plain-language verdict for this run, placed before any table so a
 * casual reader gets the story without decoding chips or rank columns.
 * Every number is derived from committee.json, never hand-written.
 */
export function CommitteeTakeawayCard({
  data,
}: {
  data: CommitteeComparisonPayload;
}) {
  const takeaway = buildTakeaway(data);
  const taxonomy = classifyDisagreements(data);
  const { byes } = takeaway;

  const byeClause = byes.comparable
    ? byes.matched.length === byes.committeeByes.length
      ? " and placed all four first-round byes on the same teams"
      : ` and matched ${byes.matched.length} of ${byes.committeeByes.length} first-round byes`
    : "";

  const digest: string[] = [
    `${takeaway.overlapCount}/${takeaway.fieldSize} field`,
  ];
  if (byes.comparable) {
    digest.push(`${byes.matched.length}/${byes.committeeByes.length} byes`);
  }
  if (taxonomy.counts.bubble_swap > 0) {
    digest.push(
      `${taxonomy.counts.bubble_swap} bubble swap${taxonomy.counts.bubble_swap === 1 ? "" : "s"}`,
    );
  }
  if (taxonomy.counts.auto_bid_displacement > 0) {
    digest.push(`${taxonomy.counts.auto_bid_displacement} auto-bid displacement`);
  }
  if (takeaway.character === "none") {
    digest.push("exact field match");
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2.5">
        <span className={metricLabel}>The {takeaway.season} takeaway</span>
        <p className="max-w-3xl text-sm leading-[1.85] text-foreground sm:text-[15px]">
          Selection Room matched{" "}
          <span className="font-semibold">
            {takeaway.overlapCount} of {takeaway.fieldSize}
          </span>{" "}
          of the committee&apos;s field teams{byeClause}.{" "}
          {takeaway.character === "none" ? (
            <>The projected field matches the committee&apos;s exactly.</>
          ) : (
            <>
              {takeaway.character === "auto_bid_displacement"
                ? "The fields differ because an automatic bid lands differently: "
                : takeaway.character === "mixed"
                  ? "The fields differ in more than one way: "
                  : "The one disagreement is the final at-large call: "}
              the model takes {joinChips(takeaway.modelOnly)} where the
              committee selected {joinChips(takeaway.committeeOnly)}.
            </>
          )}
        </p>
        {takeaway.character === "bubble_swap" ? (
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            That call comes from how the model weighs resume quality,
            predictive strength, and schedule metrics, not from auto-bid
            logic. It is a weighting judgment, and every input behind it is
            inspectable.
          </p>
        ) : takeaway.character === "auto_bid_displacement" ? (
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            A conference champion claims an automatic bid on one side of the
            comparison, which reshapes the at-large math rather than
            reflecting a ranking disagreement.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {digest.map((item, i) => (
            <span key={item} className="inline-flex items-center gap-2">
              {i > 0 ? (
                <span aria-hidden className="text-muted-foreground/40">
                  &middot;
                </span>
              ) : null}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
