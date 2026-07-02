import { Badge } from "@/components/ui/badge";
import { RulesetBadge } from "@/components/team/RulesetBadge";
import { getLatest, NotFoundError } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { LatestPayload } from "@/lib/types";

async function loadLatest(): Promise<LatestPayload | null> {
  try {
    return await getLatest();
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** Season · week · ruleset · data-source · generated-at, read from latest.json. Degrades gracefully before the first run exists. */
export async function RunContextBar() {
  const latest = await loadLatest();

  if (!latest) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-md border border-dashed border-border bg-card/40 px-4 py-2.5 text-xs text-muted-foreground">
        No run data yet — seed fixtures or run the exporter to populate{" "}
        <code className="rounded bg-secondary px-1 py-0.5 font-mono">
          data/output/api/
        </code>
        .
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card/60 px-4 py-2.5">
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {latest.season} · Week {latest.week}
      </span>
      <div className="h-4 w-px bg-border" />
      <RulesetBadge ruleset={latest.ruleset} />
      <Badge
        variant="outline"
        className="cursor-default border-border bg-secondary text-muted-foreground"
      >
        {latest.data_source === "cfbd" ? "Live CFBD data" : "Sample data"}
      </Badge>
      <div className="ml-auto text-xs text-muted-foreground">
        Generated {formatDateTime(latest.generated_at)}
      </div>
    </div>
  );
}
