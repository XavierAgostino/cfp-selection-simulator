import type { Metadata } from "next";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingAudienceSection } from "@/components/landing/LandingAudienceSection";
import { LandingCommitteeTendenciesPreview } from "@/components/landing/LandingCommitteeTendenciesPreview";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblemPromises } from "@/components/landing/LandingProblemPromises";
import { LandingProductSurfaces } from "@/components/landing/LandingProductSurfaces";
import { LandingSelectionFlow } from "@/components/landing/LandingSelectionFlow";
import { LandingValidationStrip } from "@/components/landing/LandingValidationStrip";
import { getLandingPreviewData } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Selection Room | CFP Selection, Explained",
  description:
    "An independent CFP selection analysis workspace. Inspect team cases, audit the selection path, test model assumptions, and validate historical behavior.",
};

export default async function LandingPage() {
  const data = await getLandingPreviewData();

  return (
    <div className="overflow-x-hidden bg-background">
      <LandingHero data={data} />
      <LandingProblemPromises />
      <LandingSelectionFlow data={data} />
      <LandingProductSurfaces data={data} />
      <LandingCommitteeTendenciesPreview data={data.committeeTendencies} />
      <LandingValidationStrip data={data.validationHeadlines} />
      <LandingAudienceSection />
      <FinalCtaSection />
    </div>
  );
}
