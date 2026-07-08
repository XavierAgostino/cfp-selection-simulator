import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ValidationHeadlines } from "@/lib/landing-data";
import {
  landingSectionBody,
  landingSectionEyebrow,
  landingSectionTitle,
} from "@/lib/landing-typography";

/**
 * Credibility strip. Every metric here comes straight from validation.json via
 * getLandingPreviewData — any value the fixture cannot support is already null
 * and simply not rendered. Labels stay in "overlap" language, never "accuracy".
 */
export function LandingValidationStrip({ data }: { data: ValidationHeadlines | null }) {
  if (!data) return null;

  const metrics: { value: string; label: string }[] = [];
  if (data.latestFieldOverlap) {
    metrics.push({
      value: data.latestFieldOverlap.value,
      label: `${data.latestFieldOverlap.season} committee field overlap`,
    });
  }
  if (data.avgTop12Overlap) {
    metrics.push({ value: data.avgTop12Overlap, label: "Average top-12 overlap" });
  }
  if (data.seasonRange) {
    metrics.push({ value: data.seasonRange, label: "Historical validation window" });
  }

  if (metrics.length === 0) return null;

  return (
    <section className="border-b border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="reveal-on-scroll mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className={landingSectionEyebrow}>Built to be checked</p>
          <h2 className={`${landingSectionTitle} mt-3`}>
            Validated against a decade of committee fields.
          </h2>
          <p className={`${landingSectionBody} mt-4`}>
            Selection Room validates against prior committee fields, top-12 overlap, field overlap,
            and game-level predictive checks.
          </p>
        </div>

        <dl className="mt-10 grid gap-6 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col gap-1 border-t border-border pt-5"
            >
              <dt className="sr-only">{metric.label}</dt>
              <dd className="text-4xl font-semibold tabular-nums tracking-tight text-foreground md:text-5xl">
                {metric.value}
              </dd>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </dl>

        <Link
          href="/validation"
          className="mt-9 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-tag-red-text underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Full validation breakdown
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
