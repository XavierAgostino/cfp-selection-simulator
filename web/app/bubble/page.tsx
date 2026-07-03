import { RunHeader } from "@/components/layout/RunHeader";
import { PageNavIcon } from "@/components/icons/PageNavIcon";
import { EmptyState } from "@/components/common/EmptyState";
import { BubbleBoard } from "@/components/bubble/BubbleBoard";
import { SelectionAuditTimeline } from "@/components/audit/SelectionAuditTimeline";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { getRunFile, NotFoundError } from "@/lib/data";
import type {
  AuditPayload,
  FieldPayload,
  SensitivityPayload,
} from "@/lib/types";

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

async function loadSensitivity(
  stem: string | null,
): Promise<SensitivityPayload | null> {
  try {
    return await getRunFile(stem, "sensitivity");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export default async function BubblePage({ searchParams }: BubblePageProps) {
  const { run } = await searchParams;
  const stem = run ?? null;
  const [field, audit, sensitivity] = await Promise.all([
    loadField(stem),
    loadAudit(stem),
    loadSensitivity(stem),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RunHeader stem={stem} />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bubble watch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The last teams in and the first teams out, and how close it is.
        </p>
      </div>
      {field ? (
        <>
          <BubbleBoard field={field} sensitivity={sensitivity} />
          {audit ? (
            <Card className="gap-0 border-border bg-card py-0">
              <Collapsible>
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-4 text-left transition-colors hover:bg-secondary/40">
                  <div className="flex flex-col gap-1">
                    <CardTitle>How this field was selected</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      The full rule-by-rule audit trail for this projected
                      field. Expand to walk each selection phase.
                    </span>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-5">
                    <SelectionAuditTimeline
                      phases={audit.phases}
                      variant="full"
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
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
