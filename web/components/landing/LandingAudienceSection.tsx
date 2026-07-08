import { TeamLogoField } from "@/components/landing/TeamLogoField";
import {
  landingSectionBody,
  landingSectionEyebrow,
  landingSectionTitle,
} from "@/lib/landing-typography";

/**
 * Who it is for — short, no testimonials. Three audience cards under a single
 * framing headline, given weight with a large index watermark and depth so the
 * block reads as designed rather than three plain boxes, over the shared team
 * wall for continuity with the other narrative sections.
 */

const AUDIENCES: { label: string; body: string }[] = [
  { label: "Fans", body: "Understand why your team is in or out." },
  { label: "Media", body: "Get clear visuals for the bubble debate." },
  { label: "Analysts", body: "Test assumptions and compare committee behavior." },
];

export function LandingAudienceSection() {
  return (
    <section className="relative overflow-hidden border-b border-border px-4 py-16 sm:px-6 sm:py-24">
      <TeamLogoField />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className={landingSectionEyebrow}>Who it&apos;s for</p>
          <h2 className={`${landingSectionTitle} mt-3`}>
            Built for people who live in the selection debate.
          </h2>
          <p className={`${landingSectionBody} mt-4 max-w-xl`}>
            Fans, writers, podcasters, analysts, and college football people who want a transparent
            audit layer.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {AUDIENCES.map((audience, index) => (
            <div
              key={audience.label}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card to-background/50 p-6 transition-colors hover:border-accent-gold/30"
            >
              <span
                className="pointer-events-none absolute -right-2 -top-4 text-7xl font-bold tabular-nums text-foreground/[0.04] transition-colors group-hover:text-accent-gold/10"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="relative text-lg font-semibold text-foreground">{audience.label}</h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">
                {audience.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
