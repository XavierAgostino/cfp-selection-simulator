import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { ScoreBars } from "@/components/team/ScoreBars";
import { ResumeStabilityBlock } from "@/components/team/ResumeStabilityBlock";
import { ResumeScheduleList } from "@/components/team/ResumeScheduleList";
import { ScrollArea } from "@/components/ui/scroll-area";
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
          <span className="text-xs text-muted-foreground">
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
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Summary resume</p>
      <p className="mt-1 leading-relaxed">
        Detailed schedule and selection case are available for projected field and
        bubble teams. Core ranking, record, and score data are shown here.
      </p>
    </div>
  );
}

/** The team resume body — reused verbatim by the drawer (client-fetched) and the deep-linkable team page (server-fetched). */
export function ResumeContent({ resume, recordMeta, variant, footer }: ResumeContentProps) {
  const isSummary = resume.detail_level === "summary";
  if (variant === "page") {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <ResumeHeader resume={resume} recordMeta={recordMeta} />
          {isSummary ? <SummaryResumeNotice /> : null}
          <div className="rounded-xl bg-card/60 p-4">
            <ScoreBars resume={resume} />
          </div>
          <ResumeStabilityBlock team={resume.team} />
          <WhyInConcerns resume={resume} />
        </div>
        {!isSummary ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule
            </h3>
            <div className="rounded-xl bg-secondary/30 px-4 py-1">
              <ResumeScheduleList schedule={resume.schedule} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <ResumeHeader resume={resume} recordMeta={recordMeta} />
      {isSummary ? <SummaryResumeNotice /> : null}
      <ScoreBars resume={resume} />
      <ResumeStabilityBlock team={resume.team} />
      <WhyInConcerns resume={resume} />
      {!isSummary ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Schedule
          </h3>
          <ScrollArea className="min-h-0 flex-1 rounded-xl bg-secondary/30">
            <ResumeScheduleList schedule={resume.schedule} className="px-4" />
          </ScrollArea>
        </div>
      ) : null}
      {footer}
    </div>
  );
}
