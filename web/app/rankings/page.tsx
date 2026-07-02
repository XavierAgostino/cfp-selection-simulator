import { ListOrdered } from "lucide-react";
import { RunContextBar } from "@/components/layout/RunContextBar";
import { EmptyState } from "@/components/common/EmptyState";

export default function RankingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The full composite rankings, with resume, predictive, SOR, and SOS components.
        </p>
      </div>
      <EmptyState
        icon={<ListOrdered className="h-5 w-5" />}
        title="Rankings table under construction"
        description="A sortable, filterable rankings table with every scoring component is being built."
      />
    </div>
  );
}
