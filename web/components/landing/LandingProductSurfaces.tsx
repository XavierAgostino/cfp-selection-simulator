import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BracketGame } from "@/components/bracket/BracketGame";
import { BubbleCutlineChart } from "@/components/charts/BubbleCutlineChart";
import { FieldRow, StabilityRow } from "@/components/landing/landing-preview-primitives";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingSectionEyebrow, landingSectionTitle } from "@/lib/landing-typography";
import { cn } from "@/lib/utils";

/**
 * Controlled product previews with real hierarchy: one wide feature card (the
 * projected field) anchors the grid, with the bracket, bubble, Scenario Lab, and
 * validation as compact supporting cards. Each stays a single title + sentence +
 * one small visual + one link — no embedded dashboards or full tables.
 */

function SurfaceCard({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent-gold">
          {eyebrow}
        </span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/40 p-3">
        {children}
      </div>
      <Link
        href={href}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-tag-red-text underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {linkLabel}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

export function LandingProductSurfaces({ data }: { data: LandingPreviewData }) {
  const byes = data.field.field.filter((team) => team.is_bye);
  const firstRound = data.field.field.filter((team) => !team.is_bye);
  const featurePod = data.bracket.pods[0];
  const stabilityRows =
    data.sensitivity?.teams.filter((team) => team.status === "bubble").slice(0, 2) ??
    data.sensitivity?.teams.slice(10, 12) ??
    [];
  const avgOverlap = data.validationHeadlines?.avgTop12Overlap ?? null;

  return (
    <section className="border-b border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="reveal-on-scroll mx-auto max-w-6xl">
        <div className="flex flex-col gap-3">
          <p className={landingSectionEyebrow}>The workspace</p>
          <h2 className={landingSectionTitle}>Five surfaces, one rule engine.</h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {/* Wide feature card — the projected field */}
          <SurfaceCard
            eyebrow="Dashboard"
            title="The projected field"
            description="The full 12-team bracket with seeds, bids, and composite scores from the live run — byes up top, first-round games below."
            href="/dashboard"
            linkLabel="Open dashboard"
            className="lg:col-span-2"
          >
            <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <p className="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-tag-gold-text">
                  Byes
                </p>
                {byes.map((team) => (
                  <FieldRow key={team.team} team={team} />
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="mb-1 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  First round
                </p>
                {firstRound.slice(0, 4).map((team) => (
                  <FieldRow key={team.team} team={team} />
                ))}
              </div>
            </div>
          </SurfaceCard>

          {/* Bracket path — one pod */}
          <SurfaceCard
            eyebrow="Bracket"
            title="Follow the path"
            description="Every pod is filled from the same engine, byes waiting in the quarterfinal."
            href="/bracket"
            linkLabel="Open full bracket"
          >
            {featurePod ? (
              <BracketGame pod={featurePod} />
            ) : (
              <p className="text-sm text-muted-foreground">Bracket pods populate from the live run.</p>
            )}
          </SurfaceCard>

          {/* Bubble */}
          <SurfaceCard
            eyebrow="Bubble"
            title="Watch the cut line"
            description="Last teams in and first teams out, with the margin that separates them."
            href="/bubble"
            linkLabel="Open bubble board"
          >
            <BubbleCutlineChart
              lastFourIn={data.field.last_four_in}
              firstFourOut={data.field.first_four_out}
              variant="mini"
            />
          </SurfaceCard>

          {/* Scenario Lab */}
          <SurfaceCard
            eyebrow="Scenario Lab"
            title="Stress the assumptions"
            description="Perturb the factor weights and see which teams hold their spot and which slip."
            href="/scenario-lab"
            linkLabel="Open Scenario Lab"
          >
            {stabilityRows.length > 0 ? (
              <div className="flex flex-col gap-2">
                {stabilityRows.map((team) => (
                  <StabilityRow key={team.team} team={team} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run a sensitivity sweep to preview weight stress tests.
              </p>
            )}
          </SurfaceCard>

          {/* Validation */}
          <SurfaceCard
            eyebrow="Validation"
            title="Checked against history"
            description="Compared to prior committee fields across a decade of finished seasons."
            href="/validation"
            linkLabel="View validation"
          >
            {avgOverlap ? (
              <div className="flex h-full flex-col justify-center gap-1">
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {avgOverlap}
                </span>
                <span className="text-sm text-muted-foreground">Average top-12 overlap</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Historical committee-field comparisons and game-level checks.
              </p>
            )}
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}
