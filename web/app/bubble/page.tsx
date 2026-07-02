import { Gauge } from "lucide-react";
import { RunContextBar } from "@/components/layout/RunContextBar";
import { EmptyState } from "@/components/common/EmptyState";

export default function BubblePage() {
  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bubble watch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The last teams in and the first teams out — and how close it is.
        </p>
      </div>
      <EmptyState
        icon={<Gauge className="h-5 w-5" />}
        title="Bubble watch under construction"
        description="A dedicated view of the last four in versus the first four out, with the margins that separate them, is being built."
      />
    </div>
  );
}
