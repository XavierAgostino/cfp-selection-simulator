import { Network } from "lucide-react";
import { RunContextBar } from "@/components/layout/RunContextBar";
import { EmptyState } from "@/components/common/EmptyState";

export default function BracketPage() {
  return (
    <div className="flex flex-col gap-6">
      <RunContextBar />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bracket</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The full 12-team playoff bracket, pod by pod.
        </p>
      </div>
      <EmptyState
        icon={<Network className="h-5 w-5" />}
        title="Bracket viewer under construction"
        description="The flagship bracket reveal — pods, byes, and the path to the championship — is being built."
      />
    </div>
  );
}
