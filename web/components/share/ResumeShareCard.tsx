"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { ShareCardFrame } from "@/components/share/ShareCardFrame";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { BidBadge } from "@/components/team/BidBadge";
import { SeedBadge } from "@/components/team/SeedBadge";
import { ConferenceBadge, ConferenceCaption } from "@/components/team/ConferenceBadge";
import { ScoreBars } from "@/components/team/ScoreBars";
import { formatRecord } from "@/lib/format";
import { recordSummaryLine } from "@/lib/recordMeta";
import type { RecordMeta, TeamResume } from "@/lib/types";

export const RESUME_SHARE_CARD_WIDTH = 1080;

interface ResumeShareCardProps {
  resume: TeamResume;
  recordMeta?: RecordMeta | null;
  season?: number;
  week?: number;
}

/** A team's resume as a branded share graphic: header, score bars, case lines. */
export function ResumeShareCard({
  resume,
  recordMeta,
  season,
  week,
}: ResumeShareCardProps) {
  const reasons = (
    resume.selection_case?.reasons?.length
      ? resume.selection_case.reasons
      : resume.why_in
  ).slice(0, 3);
  const concerns = (
    resume.selection_case?.concerns?.length
      ? resume.selection_case.concerns
      : resume.concerns
  ).slice(0, 2);
  const caseTitle =
    resume.selection_case?.headline ??
    (resume.in_field ? "Why they're in" : "Selection case");
  const recordCaption = recordSummaryLine(recordMeta);

  return (
    <ShareCardFrame
      width={RESUME_SHARE_CARD_WIDTH}
      contextLabel={
        season && week ? `${season} · Week ${week}` : undefined
      }
      footnote={recordCaption ? `Record: ${recordCaption}` : undefined}
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <TeamLogoTile
              team={resume.team}
              logoUrl={resume.logo_url}
              abbreviation={resume.abbreviation}
              primaryColor={resume.primary_color}
              size={64}
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                {resume.team}
              </h2>
              {resume.is_conference_champion ? (
                <ConferenceBadge
                  conference={resume.conference}
                  isChampion
                  championOf={resume.champion_of}
                  size="lg"
                />
              ) : (
                <ConferenceCaption conference={resume.conference} />
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatRecord(resume.record)}
                </span>
                <BidBadge bidType={resume.bid_type} />
                <SeedBadge seed={resume.seed} isBye={(resume.seed ?? 99) <= 4} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Composite
            </span>
            <span className="text-5xl font-bold tabular-nums text-accent-gold">
              #{resume.rank}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
          <div className="rounded-xl bg-card/60 p-5">
            <ScoreBars resume={resume} />
          </div>
          <div className="flex flex-col gap-5">
            {reasons.length > 0 ? (
              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                  {caseTitle}
                </h3>
                <ul className="flex flex-col gap-2">
                  {reasons.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-snug text-foreground/90"
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
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-accent-gold">
                  Concerns
                </h3>
                <ul className="flex flex-col gap-2">
                  {concerns.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-snug text-foreground/90"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-gold" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ShareCardFrame>
  );
}
