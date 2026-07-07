import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Compact dashboard teaser for the Committee Tendencies research feature.
 * Deep-links into the full cards on /validation. The one-sentence takeaway is
 * rendered verbatim from the artifact (payload.disclaimer); only the feature
 * name, the Research-only tag, and the link label are structural labels.
 */
export function CommitteeTendenciesTeaser({ takeaway }: { takeaway: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle>Committee Tendencies</CardTitle>
        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Research-only
        </span>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-sm leading-relaxed text-foreground">{takeaway}</p>
        <Link
          href="/validation#committee-tendencies"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          View Committee Tendencies
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
