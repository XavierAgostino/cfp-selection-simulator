import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingProductBoard } from "@/components/landing/LandingProductBoard";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingHeroBody, landingHeroTitle } from "@/lib/landing-typography";

export function LandingHero({ data }: { data: LandingPreviewData }) {
  return (
    <section className="overflow-x-hidden border-b border-border px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:gap-16">
        <div className="flex max-w-2xl flex-col items-center gap-5 text-center lg:max-w-3xl lg:gap-6">
          <h1 className={landingHeroTitle}>CFP Selection, Explained</h1>
          <p className={landingHeroBody}>
            Selection Room is an independent analysis workspace for the College Football Playoff
            field. Inspect every team&apos;s case, audit the selection path, test model
            assumptions, and validate how the system behaves historically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button nativeButton={false} render={<Link href="/dashboard" />} size="lg">
              Open Selection Room
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/methodology" />}
              size="lg"
            >
              Read Methodology
            </Button>
          </div>
        </div>

        <LandingProductBoard data={data} />
      </div>
    </section>
  );
}
