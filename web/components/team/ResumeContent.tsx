import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { ScoreBars } from "@/components/team/ScoreBars";
import { ResumeStabilityBlock } from "@/components/team/ResumeStabilityBlock";
import { ResumeScheduleList } from "@/components/team/ResumeScheduleList";
import { CollapsibleSchedule } from "@/components/team/CollapsibleSchedule";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatRecord } from "@/lib/format";
import { recordColumnTooltip, recordSummaryLine } from "@/lib/recordMeta";
import type { RecordMeta, TeamResume } from "@/lib/types";

interface ResumeContentProps {
  resume: TeamResume;
  recordMeta?: RecordMeta | null;
  /** "drawer" stacks everything vertically inside a fixed-width sheet; "page" opens up a wider two-column layout. */
  variant: "drawer" | "page";
  /** Extra content rendered after the metrics/why-in block, e.g. the "Full team page" link in the drawer. */
  footer?: ReactNode;
}

function ResumeHeader({
  resume,
  recordMeta,
}: {
  resume: TeamResume;
  recordMeta?: RecordMeta | null;
}) {
  const recordCaption = recordSummaryLine(recordMeta);
  const recordTooltip = recordColumnTooltip(recordMeta);
  return (
    <div className="flex items-start gap-3">
      <TeamLogoTile
        team={resume.team}
        logoUrl={resume.logo_url}
        abbreviation={resume.abbreviation}
        primaryColor={resume.primary_color}
        size={52}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {resume.team}
          </h2>
          {resume.is_conference_champion ? (
            <ConferenceBadge
              conference={resume.conference}
              isChampion
              championOf={resume.champion_of}
              size="lg"
            />
          ) : null}
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            #{resume.rank}
          </span>
        </div>
        {!resume.is_conference_champion ? (
          <ConferenceCaption conference={resume.conference} />
        ) : null}
        <p className="text-sm text-muted-foreground">
          {formatRecord(resume.record)}
          {recordCaption ? (
            <span
              className="ml-1 text-xs underline decoration-dotted underline-offset-2"
              title={recordTooltip}
            >
              ({recordCaption})
            </span>
          ) : null}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <BidBadge bidType={resume.bid_type} />
          <SeedBadge seed={resume.seed} isBye={(resume.seed ?? 99) <= 4} />
        </div>
      </div>
    </div>
  );
}

/** Larger identity block for the standalone team page: logo, name, and a single meta line. */
function TeamPageHero({
  resume,
  recordMeta,
}: {
  resume: TeamResume;
  recordMeta?: RecordMeta | null;
}) {
  const recordCaption = recordSummaryLine(recordMeta);
  const recordTooltip = recordColumnTooltip(recordMeta);
  return (
    <div className="flex items-start gap-4">
      <TeamLogoTile
        team={resume.team}
        logoUrl={resume.logo_url}
        abbreviation={resume.abbreviation}
        primaryColor={resume.primary_color}
        size={64}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {resume.team}
          </h1>
          {resume.is_conference_champion ? (
            <ConferenceBadge
              conference={resume.conference}
              isChampion
              championOf={resume.champion_of}
              size="lg"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            #{resume.rank}
          </span>
          <BidBadge bidType={resume.bid_type} />
          {resume.seed !== null ? (
            <SeedBadge seed={resume.seed} isBye={(resume.seed ?? 99) <= 4} />
          ) : null}
          {!resume.is_conference_champion ? (
            <ConferenceCaption conference={resume.conference} />
          ) : null}
          <span>
            {formatRecord(resume.record)}
            {recordCaption ? (
              <span
                className="ml-1 text-xs underline decoration-dotted underline-offset-2"
                title={recordTooltip}
              >
                ({recordCaption})
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

function selectionSectionTitle(resume: TeamResume): string {
  if (resume.selection_case?.headline) {
    return resume.selection_case.headline;
  }
  if (resume.in_field) return "Why they're in";
  if (resume.detail_level === "summary") return "Selection case";
  return "Why they missed";
}

function WhyInConcerns({ resume }: { resume: TeamResume }) {
  const reasons =
    resume.selection_case?.reasons?.length
      ? resume.selection_case.reasons
      : resume.why_in;
  const concerns =
    resume.selection_case?.concerns?.length
      ? resume.selection_case.concerns
      : resume.concerns;

  if (reasons.length === 0 && concerns.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {reasons.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            {selectionSectionTitle(resume)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {reasons.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {concerns.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-gold">
            Concerns
          </h3>
          <ul className="flex flex-col gap-1.5">
            {concerns.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SummaryResumeNotice() {
  return (
    <Alert>
      <AlertTitle>Summary resume</AlertTitle>
      <AlertDescription>
        Detailed schedule and selection case are available for projected field and
        bubble teams. Core ranking, record, and score data are shown here.
      </AlertDescription>
    </Alert>
  );
}

/** The team resume body — reused verbatim by the drawer (client-fetched) and the deep-linkable team page (server-fetched). */
export function ResumeContent({ resume, recordMeta, variant, footer }: ResumeContentProps) {
  const isSummary = resume.detail_level === "summary";
  if (variant === "page") {
    // Wins over ranked opponents (best first) and every loss — the games that
    // most shape the selection case, surfaced above the full schedule.
    const rankedWins = resume.schedule
      .filter((game) => game.result === "W" && game.opponent_rank !== null)
      .sort((a, b) => (a.opponent_rank ?? 0) - (b.opponent_rank ?? 0));
    const losses = resume.schedule.filter((game) => game.result === "L");
    const hasResults = rankedWins.length > 0 || losses.length > 0;

    // The "case" stack: is this team in (status), why (team case), and the
    // score profile behind it. Reused for summary and full layouts.
    const caseColumn = (
      <>
        <ResumeStabilityBlock team={resume.team} />
        <Card>
          <CardHeader>
            <CardTitle>Team case</CardTitle>
          </CardHeader>
          <CardContent>
            <WhyInConcerns resume={resume} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBars resume={resume} />
          </CardContent>
        </Card>
      </>
    );

    if (isSummary) {
      return (
        <div className="flex flex-col gap-6">
          <TeamPageHero resume={resume} recordMeta={recordMeta} />
          <SummaryResumeNotice />
          <div className="flex flex-col gap-6">{caseColumn}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <TeamPageHero resume={resume} recordMeta={recordMeta} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-6">{caseColumn}</div>
          <Card>
            <CardHeader>
              <CardTitle>Schedule résumé</CardTitle>
              <CardDescription>
                FBS games only. Bye weeks and FCS opponents are not shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {hasResults ? (
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  {rankedWins.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Quality wins
                      </h3>
                      <ResumeScheduleList schedule={rankedWins} />
                    </div>
                  ) : null}
                  {losses.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-accent-gold">
                        Losses
                      </h3>
                      <ResumeScheduleList schedule={losses} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {hasResults ? <Separator /> : null}
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Full schedule
                </h3>
                <CollapsibleSchedule schedule={resume.schedule} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Drawer: the whole body is one scroll region so short mobile viewports can
  // reach the schedule and every section below the fold. The footer stays
  // pinned beneath it. (Scoping the scroll to just the schedule collapsed its
  // window to ~1 row on phones and left the rest of the drawer unscrollable.)
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-4 pb-4">
          <ResumeHeader resume={resume} recordMeta={recordMeta} />
          {isSummary ? <SummaryResumeNotice /> : null}
          <ScoreBars resume={resume} />
          <ResumeStabilityBlock team={resume.team} />
          <WhyInConcerns resume={resume} />
          {!isSummary ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Schedule
              </h3>
              <div className="rounded-xl bg-secondary/30 px-4">
                <ResumeScheduleList schedule={resume.schedule} />
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      {footer ? (
        <div className="border-t border-border/60 px-4 pt-4">{footer}</div>
      ) : null}
    </div>
  );
}
