import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingHeroVisual } from "@/components/landing/LandingHeroVisual";
import { TeamLogoField } from "@/components/landing/TeamLogoField";
import type { LandingPreviewData } from "@/lib/landing-data";
import { landingHeroBody, landingHeroTitle } from "@/lib/landing-typography";

export function LandingHero({ data }: { data: LandingPreviewData }) {
  return (
    <section className="relative overflow-x-hidden border-b border-border px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:pb-28 lg:pt-32">
      <TeamLogoField variant="hero" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-14 lg:gap-20">
        <div className="flex max-w-3xl flex-col items-center gap-6 text-center lg:max-w-4xl">
          <h1 className={`${landingHeroTitle} landing-rise`} style={{ animationDelay: "60ms" }}>
            CFP Selection, Explained.
          </h1>
          <p className={`${landingHeroBody} landing-rise`} style={{ animationDelay: "140ms" }}>
            Selection Room is an independent analytics workspace for projecting the College
            Football Playoff field, auditing the bubble, comparing model vs committee, and testing
            selection assumptions. See who&apos;s in, who&apos;s out, why the bracket changes, and
            where a transparent model disagrees with the committee.
          </p>
          <div
            className="landing-rise flex flex-col items-center gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-center"
            style={{ animationDelay: "220ms" }}
          >
            <Button
              nativeButton={false}
              render={<Link href="/dashboard" />}
              size="xl"
              className="w-full sm:w-auto"
            >
              Open Selection Room
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/validation" />}
              size="xl"
              className="w-full sm:w-auto"
            >
              View validation
            </Button>
          </div>
          <p className="landing-rise text-xs text-muted-foreground" style={{ animationDelay: "290ms" }}>
            Not affiliated with the CFP, NCAA, ESPN, or any conference.
          </p>
        </div>

        <div className="landing-rise w-full min-w-0" style={{ animationDelay: "360ms" }}>
          <LandingHeroVisual data={data} />
        </div>
      </div>
    </section>
  );
}
