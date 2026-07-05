import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingProductBoard } from "@/components/landing/LandingProductBoard";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingHeroBody, landingHeroTitle } from "@/lib/landing-typography";

export function LandingHero({ data }: { data: LandingPreviewData }) {
  return (
    <section className="overflow-x-hidden border-b border-border px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 lg:gap-20">
        <div className="flex max-w-3xl flex-col items-center gap-6 text-center lg:max-w-4xl">
          <h1 className={landingHeroTitle}>CFP Selection, Explained</h1>
          <p className={landingHeroBody}>
            Selection Room is an independent analysis workspace for the College Football Playoff
            field. Inspect every team&apos;s case, audit the selection path, test model
            assumptions, and validate how the system behaves historically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button nativeButton={false} render={<Link href="/dashboard" />} size="xl">
              Open Selection Room
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/methodology" />}
              size="xl"
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
