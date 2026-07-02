import { RunContextBar } from "@/components/layout/RunContextBar";
import { PageNavIcon } from "@/components/icons/PageNavIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { BubbleBoard } from "@/components/bubble/BubbleBoard";
import { SelectionAuditTimeline } from "@/components/audit/SelectionAuditTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRunFile, NotFoundError } from "@/lib/data";
import type { AuditPayload, FieldPayload } from "@/lib/types";

interface BubblePageProps {
  searchParams: Promise<{ run?: string }>;
}

async function loadField(stem: string | null): Promise<FieldPayload | null> {
  try {
    return await getRunFile(stem, "field");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

async function loadAudit(stem: string | null): Promise<AuditPayload | null> {
  try {
    return await getRunFile(stem, "audit");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function BubblePage({ searchParams }: BubblePageProps) {
  const { run } = await searchParams;
  const stem = run ?? null;
  const [field, audit] = await Promise.all([loadField(stem), loadAudit(stem)]);

  return (
    <div className="flex flex-col gap-6">
      <RunContextBar stem={stem} />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bubble watch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The last teams in and the first teams out — and how close it is.
        </p>
      </div>
      {field ? (
        <>
          <BubbleBoard field={field} />
          {audit ? (
            <Card className="border-border bg-card">
              <CardHeader className="px-4">
                <CardTitle>How this field was selected</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <SelectionAuditTimeline phases={audit.phases} variant="full" />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<PageNavIcon href="/bubble" />}
          title="No bubble data for this run"
          description="The selection engine hasn't produced field.json yet. Run the pipeline, then refresh."
        />
      )}
    </div>
  );
}
