import { TeamLogoField } from "@/components/landing/TeamLogoField";
import { landingSectionEyebrow, landingSectionTitle } from "@/lib/landing-typography";

/**
 * Problem framing and the four-pillar promise. The November debate now reads as
 * an editorial split — the framing on the left, the recurring questions stacked
 * as large, numbered lines on the right — over a faint wall of real team logos
 * so the section feels rooted in the sport instead of floating on black.
 */

const PILLARS: { title: string; body: string }[] = [
  {
    title: "Project the field",
    body: "See the 12-team bracket, automatic bids, at-large teams, byes, and first-round matchups.",
  },
  {
    title: "Audit the bubble",
    body: "Track last teams in, first teams out, stability, and which assumptions move the cut line.",
  },
  {
    title: "Compare the committee",
    body: "See where Selection Room agrees or disagrees with the committee and what tendencies their rankings imply.",
  },
  {
    title: "Test assumptions",
    body: "Change factor weights in Scenario Lab and rerun the field under transparent rules.",
  },
];

const QUESTIONS = [
  "Who is actually in?",
  "Who is being helped by the rules?",
  "Who is being punished by schedule, résumé, or predictive strength?",
  "And what does the committee appear to value?",
];

export function LandingProblemPromises() {
  return (
    <section className="relative overflow-hidden border-b border-border px-4 py-16 sm:px-6 sm:py-24">
      <TeamLogoField />
      <div className="reveal-on-scroll relative mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className={landingSectionEyebrow}>The November debate</p>
            <h2 className={landingSectionTitle}>Every November, the same questions come back.</h2>
            <p className="text-pretty text-base font-medium text-foreground md:text-lg">
              Selection Room turns those debates into a transparent, testable workspace.
            </p>
          </div>

          <ol className="flex flex-col divide-y divide-border border-t border-border">
            {QUESTIONS.map((question, index) => (
              <li key={question} className="group flex items-baseline gap-5 py-5 sm:gap-7">
                <span className="shrink-0 text-2xl font-semibold tabular-nums text-accent-gold/40 transition-colors group-hover:text-accent-gold sm:text-3xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-pretty text-xl font-medium leading-snug text-foreground/90 transition-colors group-hover:text-foreground sm:text-2xl">
                  {question}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.title}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card to-background/50 p-5 transition-colors hover:border-accent-gold/30"
            >
              <span
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-semibold text-foreground">{pillar.title}</h3>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
