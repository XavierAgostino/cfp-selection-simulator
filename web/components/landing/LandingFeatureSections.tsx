import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BracketGame } from "@/components/bracket/BracketGame";
import { BubbleCutlineChart } from "@/components/charts/BubbleCutlineChart";
import { formatPct } from "@/lib/format";
import { ResumeContent } from "@/components/team/ResumeContent";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";
import type { LandingPreviewData } from "@/lib/landing-data";
import {
  landingPanelTitle,
  landingSectionBody,
  landingSectionEyebrow,
  landingSectionTitle,
} from "@/lib/landing-typography";
import { teamName } from "@/lib/typography";

const landingSectionLinkClass =
  "inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-tag-red-text underline-offset-4 transition-colors hover:text-foreground hover:underline";

function SectionShell({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  children,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="border-b border-border px-4 py-16 sm:px-6 sm:py-24">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="flex flex-col gap-4">
          <p className={landingSectionEyebrow}>{eyebrow}</p>
          <h2 className={landingSectionTitle}>{title}</h2>
          <p className={landingSectionBody}>{body}</p>
          <Link href={href} className={`${landingSectionLinkClass} mt-1 w-fit`}>
            {linkLabel}
            <ArrowRight className="size-4.5" />
          </Link>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function LandingFeatureSections({ data }: { data: LandingPreviewData }) {
  const resume = data.featuredResume;
  const bubbleTeams =
    data.sensitivity?.teams.filter((team) => team.status === "bubble").slice(0, 4) ?? [];

  return (
    <>
      <section className="border-b border-border bg-surface-raised/25 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className={landingSectionEyebrow}>Not just a bracket builder</p>
            <h2 className={`${landingSectionTitle} mt-4`}>
              Selection Room explains the selection itself
            </h2>
            <p className={`${landingSectionBody} mx-auto mt-4 max-w-2xl text-center`}>
              Seeds, bids, bracket path, and bubble context come from the same rule engine — not a
              separate toy bracket generator.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.bracket.pods.slice(0, 4).map((pod) => (
              <BracketGame key={pod.pod_id} pod={pod} />
            ))}
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="Explain every team"
        title="Every team has a case"
        body="Open a full selection résumé with composite breakdown, selection reasons, concerns, schedule context, and bubble stability — the same surface you use inside the product."
        href="/rankings"
        linkLabel="Browse rankings"
      >
        <Card className="overflow-hidden border-border bg-card">
          <CardContent className="max-h-[520px] overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
            <ResumeContent
              resume={resume}
              recordMeta={data.resumes.record_meta}
              variant="drawer"
            />
          </CardContent>
        </Card>
      </SectionShell>

      <SectionShell
        eyebrow="Test assumptions"
        title="Assumptions are testable"
        body="Scenario Lab and selection stability stress the model under weight perturbations. See which teams move, which hold, and why the cut line shifts."
        href="/scenario-lab"
        linkLabel="Open Scenario Lab"
        reverse
      >
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
            {data.sensitivity ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="chip-neutral">
                    {data.sensitivity.n_scenarios.toLocaleString()} scenarios
                  </Badge>
                  <Badge variant="chip-gold">
                    ±{Math.round(data.sensitivity.perturbation_spec.relative_range * 100)}% weights
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cut line: {data.sensitivity.base_field_cutoff.final_at_large_team} in ·{" "}
                  {data.sensitivity.base_field_cutoff.first_team_out} first out
                </p>
                <div className="flex flex-col gap-2">
                  {(bubbleTeams.length > 0
                    ? bubbleTeams
                    : data.sensitivity.teams.slice(8, 12)
                  ).map((team) => (
                    <div
                      key={team.team}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                    >
                      <TeamLogoTile
                        team={team.team}
                        logoUrl={team.logo_url}
                        abbreviation={team.abbreviation}
                        primaryColor={team.primary_color}
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={teamName}>{team.team}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          Median rank #{team.median_rank}
                        </p>
                      </div>
                      <Badge variant="chip-gold" className="tabular-nums">
                        {formatPct(team.selection_frequency)} in
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </SectionShell>

      <SectionShell
        eyebrow="Validate historically"
        title="Results are validated"
        body="Calibration and committee emulation compare the model to finished seasons. Quality gates catch ideas that improve one metric but fail protected holdouts."
        href="/validation"
        linkLabel="View validation dashboard"
      >
        {data.validation ? (
          <div className="max-h-[640px] overflow-y-auto">
            <ValidationDashboard data={data.validation} embedded />
          </div>
        ) : null}
      </SectionShell>

      <section className="overflow-x-hidden border-b border-border px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl min-w-0">
          <Card className="overflow-hidden border-border bg-card">
            <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className={`${landingSectionEyebrow} text-muted-foreground`}>
                    Bubble watch
                  </p>
                  <p className={landingPanelTitle}>Cutline context from the live run</p>
                </div>
                <Link href="/bubble" className={landingSectionLinkClass}>
                  Full bubble board
                  <ArrowRight className="size-4.5" />
                </Link>
              </div>
              <BubbleCutlineChart
                lastFourIn={data.field.last_four_in}
                firstFourOut={data.field.first_four_out}
                variant="full"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
