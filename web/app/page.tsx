import type { Metadata } from "next";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingFeatureSections } from "@/components/landing/LandingFeatureSections";
import { LandingHero } from "@/components/landing/LandingHero";
import { getLandingPreviewData } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Selection Room | CFP Selection, Explained",
  description:
    "An independent CFP selection analysis workspace. Inspect team cases, audit the selection path, test model assumptions, and validate historical behavior.",
};

export default async function LandingPage() {
  const data = await getLandingPreviewData();

  return (
    <div className="dark overflow-x-hidden bg-background">
      <LandingHero data={data} />
      <LandingFeatureSections data={data} />
      <FinalCtaSection />
    </div>
  );
}
