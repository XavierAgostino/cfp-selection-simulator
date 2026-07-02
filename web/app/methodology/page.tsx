import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export default function MethodologyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Methodology</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the composite score, seeding rules, and bracket are built.
        </p>
      </div>
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="Methodology page under construction"
        description="A plain-language explanation of the resume/predictive/SOR/SOS weighting, auto-bid rules, and seeding modes is being written."
      />
    </div>
  );
}
