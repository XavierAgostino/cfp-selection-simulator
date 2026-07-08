import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingSectionEyebrow, landingSectionTitle } from "@/lib/landing-typography";
import type { TeamSlot } from "@/lib/types";

/**
 * The selection pipeline, told as a story rather than documentation. A vertical
 * numbered spine on the left carries raw results down to a committee comparison;
 * a live season-example panel on the right shows that same pipeline resolving an
 * actual field. The example is derived from the current fixture — bye team, field
 * composition, and a named bubble pair (with their real logos) — so it stays
 * truthful and fail-closed. No decorative icons, no new dependencies.
 */

const STAGES: { label: string; detail: string }[] = [
  { label: "Games & results", detail: "Every completed FBS result to date" },
  { label: "Four-factor model", detail: "Résumé, predictive, strength of record, strength of schedule" },
  { label: "CFP rules", detail: "Automatic bids, at-large teams, byes" },
  { label: "Projected field", detail: "The seeded 12-team bracket" },
  { label: "Committee comparison", detail: "Where the model and committee split" },
];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function SpotlightTeam({ team, status }: { team: TeamSlot; status: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogoTile
        team={team.team}
        logoUrl={team.logo_url}
        abbreviation={team.abbreviation}
        primaryColor={team.primary_color}
        size={26}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-semibold text-foreground">{team.team}</span>
        {status ? (
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {status}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function LandingSelectionFlow({ data }: { data: LandingPreviewData }) {
  const field = data.field;
  const byes = field.field.filter((team) => team.is_bye);
  const byeTeam = byes[0]?.team;

  // Pull the spotlight teams by name from the live fixture so their logos and
  // colors stay real; fall back to the raw cut line if a season no longer has
  // them near the bubble, so the panel is always fail-closed.
  const pool = [
    ...field.field,
    ...field.last_four_in,
    ...field.first_four_out,
    ...field.next_four_out,
  ];
  const findTeam = (name: string) => pool.find((team) => team.team === name) ?? null;

  const fieldTeam = findTeam("Oklahoma") ?? field.last_four_in.at(-1) ?? null;
  const spotlightIn = findTeam("Notre Dame") ?? field.last_four_in.at(-1) ?? null;
  const spotlightOut = findTeam("Miami") ?? field.first_four_out[0] ?? null;

  const lastInNames = new Set(field.last_four_in.map((team) => team.team));
  const firstOutNames = new Set(field.first_four_out.map((team) => team.team));
  const bubbleStatus = (name: string) =>
    lastInNames.has(name) ? "Last four in" : firstOutNames.has(name) ? "First four out" : null;

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface-raised/20 px-4 py-16 sm:px-6 sm:py-24">
      <div className="reveal-on-scroll mx-auto max-w-6xl">
        <div className="flex flex-col gap-3">
          <p className={landingSectionEyebrow}>The pipeline</p>
          <h2 className={landingSectionTitle}>From box scores to a defensible field.</h2>
          <p className="mt-1 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Selection Room takes completed FBS results, builds a transparent ranking, applies CFP
            rules, and shows where the model and committee split.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-16">
          {/* The pipeline as a vertical spine. */}
          <ol className="relative">
            {STAGES.map((stage, index) => (
              <li key={stage.label} className="relative flex gap-5 pb-9 last:pb-0">
                {index < STAGES.length - 1 ? (
                  <span
                    className="absolute left-[1.375rem] top-11 h-full w-px bg-gradient-to-b from-accent-gold/45 to-accent-gold/10"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-accent-gold/40 bg-background text-sm font-semibold tabular-nums text-accent-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 pt-2">
                  <p className="text-base font-semibold text-foreground">{stage.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* The same pipeline resolving one real season. */}
          <aside className="relative overflow-hidden rounded-2xl border border-accent-gold/25 bg-card p-6 shadow-board sm:p-8">
            <span
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent-gold/10 blur-3xl"
              aria-hidden
            />
            <p className={`${landingSectionEyebrow} relative`}>{data.seasonLabel} example</p>
            {byeTeam && fieldTeam ? (
              <p className="relative mt-4 text-pretty text-lg font-medium leading-snug text-foreground sm:text-xl">
                {byeTeam} earns a first-round bye. {fieldTeam.team} lands in the field.
              </p>
            ) : null}

            <dl className="relative mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <div>
                <dt className={eyebrow}>Input</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  Completed FBS results through Week {field.week}
                </dd>
              </div>
              <div>
                <dt className={eyebrow}>Output</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                  {field.field.length}-team field · {byes.length} first-round byes ·{" "}
                  {field.at_large_bids.length} at-large teams
                </dd>
              </div>
            </dl>

            {spotlightIn && spotlightOut ? (
              <div className="relative mt-6 border-t border-border pt-6">
                <p className={eyebrow}>The residual debate</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-3">
                  <SpotlightTeam team={spotlightOut} status={bubbleStatus(spotlightOut.team)} />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    vs
                  </span>
                  <SpotlightTeam team={spotlightIn} status={bubbleStatus(spotlightIn.team)} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The model narrows the gap but doesn&apos;t fully reproduce the committee&apos;s
                  order. This is the case a transparent field still has to argue.
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
