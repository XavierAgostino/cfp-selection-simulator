import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CommitteeWeightCompareBars } from "@/components/validation/CommitteeWeightCompareBars";
import { Badge } from "@/components/ui/badge";
import type { CommitteeTendenciesHeadline } from "@/lib/landing-data";
import {
  landingSectionBody,
  landingSectionEyebrow,
  landingSectionTitle,
} from "@/lib/landing-typography";

/**
 * Compact Committee Tendencies glance: the baseline-vs-fit bars and the
 * artifact's own short disclaimer, nothing else. No residual case, no factor
 * table, no methodology — those live on /validation. Renders nothing when the
 * research-only artifact is unavailable (fail-closed via the null data prop).
 */
export function LandingCommitteeTendenciesPreview({
  data,
}: {
  data: CommitteeTendenciesHeadline | null;
}) {
  if (!data) return null;

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface-raised/25 px-4 py-16 sm:px-6 sm:py-24">
      {/* Subtle gold atmosphere — signals "this is the signature feature". */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-accent-gold/[0.07] blur-3xl"
        aria-hidden
      />
      <div className="reveal-on-scroll relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <p className={landingSectionEyebrow}>Committee Tendencies</p>
            <Badge variant="chip-neutral" className="uppercase tracking-wide">
              Research-only
            </Badge>
          </div>
          <h2 className={landingSectionTitle}>
            See what the committee&apos;s rankings appear to value.
          </h2>
          <p className={landingSectionBody}>
            After each CFP ranking release, Selection Room estimates which factor mix best
            approximates the committee&apos;s published top 25 under a transparent four-factor
            model. Not a formula. Not a claim about secret weights. A way to inspect what the
            rankings imply.
          </p>
          <Link
            href="/validation#committee-tendencies"
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-tag-red-text underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            View Committee Tendencies
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-3 rounded-2xl bg-accent-gold/[0.06] blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 rounded-xl border border-accent-gold/25 bg-card p-5 shadow-board sm:p-6">
            <CommitteeWeightCompareBars baseline={data.baseline} fitted={data.fitted} />
            <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              {data.disclaimerShort}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
