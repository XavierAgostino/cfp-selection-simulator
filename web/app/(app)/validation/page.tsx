import { Terminal } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ValidationDashboard } from "@/components/validation/ValidationDashboard";
import { getValidationData } from "@/lib/data";
import { pageDescription, pageTitle } from "@/lib/typography";
import type { ValidationPayload } from "@/lib/types";

export const metadata = {
  title: "Model Validation | Selection Room",
  description:
    "How the transparent, rules-based model compares to the real CFP Selection Committee across historical seasons.",
};

async function loadValidation(): Promise<ValidationPayload | null> {
  return getValidationData();
}

export default async function ValidationPage() {
  const data = await loadValidation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className={pageTitle}>Model Validation</h1>
        <p className={pageDescription}>
          The honesty layer: how well the model reproduces the committee&apos;s
          rankings, picks the right field under each era&apos;s rules, and scores
          completed games. Measured against history, not asserted.
        </p>
      </header>

      {data ? (
        <ValidationDashboard data={data} />
      ) : (
        <EmptyState
          title="No validation run yet"
          description="Validation replays historical seasons and scores the model against the real committee. Run it over the seasons you have data for, then reload this page."
          action={
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
              <Terminal className="size-3.5 text-muted-foreground" />
              sroom validate --years 2014:2024
            </div>
          }
        />
      )}
    </div>
  );
}
