import { DemoModeBannerClient } from "@/components/layout/DemoModeBannerClient";
import { isDemoMode } from "@/lib/demoMode";

export function DemoModeBanner() {
  if (!isDemoMode) return null;
  return <DemoModeBannerClient />;
}
