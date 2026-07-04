import type { ReactNode } from "react";
import { HostedEmptyState } from "@/components/setup/HostedEmptyState";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { getRuns, NotFoundError } from "@/lib/data";
import { isHostedRuntimeConfigured } from "@/lib/runtime/config";

/**
 * Server-side gate: when the exporter hasn't written runs.json yet (a fresh
 * clone), every page shows the setup wizard instead of empty states. The
 * wizard's DataPoller triggers router.refresh() once data appears, which
 * re-runs this check and lets the real pages through.
 */
export async function FirstRunGate({ children }: { children: ReactNode }) {
  try {
    await getRuns();
  } catch (err) {
    if (err instanceof NotFoundError) {
      if (isHostedRuntimeConfigured()) {
        return <HostedEmptyState />;
      }
      return <SetupWizard />;
    }
    throw err;
  }
  return <>{children}</>;
}
