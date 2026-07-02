import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLatest, NotFoundError } from "@/lib/data";
import type { LatestPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

async function loadLatest(): Promise<LatestPayload | null> {
  try {
    return await getLatest();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

const DEFAULT_WEIGHTS = { resume: 0.5, predictive: 0.3, sor: 0.1, sos: 0.1 };

const WEIGHT_META: {
  key: keyof typeof DEFAULT_WEIGHTS;
  label: string;
  barClass: string;
  blurb: string;
}[] = [
  {
    key: "resume",
    label: "Resume",
    barClass: "bg-bar-resume",
    blurb:
      "What a team has actually done — a Colley-matrix rating blended with winning percentage. Beating good teams counts; losing to bad ones costs you.",
  },
  {
    key: "predictive",
    label: "Predictive",
    barClass: "bg-bar-predictive",
    blurb:
      "How good a team looks going forward — Massey ratings blended with Elo. This is the 'would they win on a neutral field' signal.",
  },
  {
    key: "sor",
    label: "Strength of Record",
    barClass: "bg-bar-sor",
    blurb:
      "How impressive the record is given the schedule: the chance an average top-tier team would match this record against this slate.",
  },
  {
    key: "sos",
    label: "Strength of Schedule",
    barClass: "bg-bar-sos",
    blurb:
      "How hard the schedule was on its own, independent of results. A small tiebreaker-scale nudge, not a driver.",
  },
];

export default async function MethodologyPage() {
  const latest = await loadLatest();
  const weights = latest?.weights ?? DEFAULT_WEIGHTS;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Methodology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the composite score, the 12-team field, and the bracket are built.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="px-4">
          <CardTitle>The composite score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every team gets one number between 0 and 1 — the composite score —
            built from four components. Each component is computed from game
            results only: no polls, no preseason priors, no brand names. The
            weights below are the exact values used for the current run.
          </p>
          <div className="flex flex-col gap-4">
            {WEIGHT_META.map((w) => {
              const value = weights[w.key];
              return (
                <div key={w.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {w.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bar-track">
                    <div
                      className={cn("h-full rounded-full", w.barClass)}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {w.blurb}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="px-4">
          <CardTitle>Filling the field: 5 + 7</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The 12-team field follows the CFP&apos;s bid structure:
          </p>
          <ol className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2.5">
              <Badge variant="chip-gold" className="mt-0.5 shrink-0">
                5 auto
              </Badge>
              <span>
                The five highest-ranked conference champions receive automatic
                bids — no matter where they sit in the rankings. If a champion
                ranks outside the top 12, it still gets in, displacing the
                lowest-ranked at-large team.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Badge variant="chip-neutral" className="mt-0.5 shrink-0">
                7 at-large
              </Badge>
              <span>
                The seven best remaining teams by composite score fill the
                at-large slots. There are no conference caps and no eye test —
                the score is the committee.
              </span>
            </li>
          </ol>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every selection decision — champions identified, bids awarded,
            displacement, seeding — is logged step by step in the audit trail
            on the Bubble page, so you can trace exactly why a team is in or
            out.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="px-4">
          <CardTitle>Seeding rules: 2024 vs 2025+</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-secondary/30 p-3.5">
              <span className="text-sm font-semibold text-foreground">
                2024 format — champion byes
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The four highest-ranked conference champions get seeds 1–4 and
                the first-round byes, even when a higher-ranked at-large team
                exists. This is what pushed teams like a one-loss at-large
                power below a conference champion on the seed line in 2024.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-secondary/30 p-3.5">
              <span className="text-sm font-semibold text-foreground">
                2025+ format — straight seeding
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Teams are seeded 1–12 strictly by ranking. The top four seeds
                get the byes regardless of championship status; automatic
                qualifiers keep their bids but not a seeding boost.
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            In both formats the bracket pods are fixed by seed: 8/9 plays into
            the 1 seed, 5/12 into the 4, 6/11 into the 3, and 7/10 into the 2.
            There is no re-seeding between rounds.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="px-4">
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Live runs pull schedules, results, and conference championships
            from the{" "}
            <a
              href="https://collegefootballdata.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              College Football Data
            </a>{" "}
            API, with team logos and colors from ESPN&apos;s public assets.
            Sample runs use a bundled synthetic season so the whole product
            works offline — every page here renders the same either way.
          </p>
          {latest ? (
            <p className="text-xs text-muted-foreground">
              Current run: {latest.season} week {latest.week} ·{" "}
              {latest.data_source === "cfbd" ? "live CFBD data" : "sample data"}{" "}
              · engine v{latest.simulator_version}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
