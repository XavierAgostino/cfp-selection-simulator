import { ChevronDown, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BubbleColumn } from "@/components/bubble/BubbleColumn";
import { BubbleCutlineChart } from "@/components/charts/BubbleCutlineChart";
import { SelectionStabilityBoard } from "@/components/charts/SelectionStabilityBoard";
import { SelectionStabilitySummary } from "@/components/charts/SelectionStabilitySummary";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import { METRIC_EXPLANATIONS } from "@/lib/explain";
import type { FieldPayload, SensitivityPayload } from "@/lib/types";

interface BubbleBoardProps {
  field: FieldPayload;
  /** Selection Stability results; omitted entirely when the run has no sensitivity.json. */
  sensitivity?: SensitivityPayload | null;
}

/** Three-column bubble board: Last Four In, First Four Out, Next Four Out — plus the displaced-team callout. */
export function BubbleBoard({ field, sensitivity }: BubbleBoardProps) {
  const { last_four_in, first_four_out, next_four_out, displaced_team } = field;
  const cutLineScore =
    last_four_in[last_four_in.length - 1]?.composite_score ?? 0;
  // A run is "contested" when at least one team sits in the 25-75% bubble
  // band; otherwise every team held its spot and the full board would render
  // as two flush columns of 0% and 100% dots.
  const hasContestedBubble =
    sensitivity?.teams.some((team) => team.status === "bubble") ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
        Selection Room fills the field with a{" "}
        <span className="font-medium text-foreground">5 + 7 model</span>: the
        five highest-ranked conference champions earn automatic bids, and the
        seven best remaining teams by composite score fill the at-large
        slots. Everything below is measured against the composite-score gap
        to that final at-large cutoff, the cut line.
      </div>

      {last_four_in.length > 0 ? (
        <Card className="gap-3 border-border bg-card shadow-none">
          <CardHeader className="px-4">
            <CardTitle>The Cut Line</CardTitle>
            <p className="text-xs text-muted-foreground">
              Who is closest to the selection cut line, and why? Every bubble
              team placed by composite score. In-field teams sit above the spine,
              teams out of the field below it, with the cut gap shaded. Hover a logo
              for the exact margin; click to open the team resume.
            </p>
          </CardHeader>
          <CardContent className="px-4">
            <BubbleCutlineChart
              lastFourIn={last_four_in}
              firstFourOut={first_four_out}
              nextFourOut={next_four_out}
            />
          </CardContent>
        </Card>
      ) : null}

      {sensitivity && sensitivity.teams.length > 0 ? (
        <Card className="gap-3 border-border bg-card shadow-none">
          <CardHeader className="px-4">
            <CardTitle>
              {METRIC_EXPLANATIONS.selection_stability.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {hasContestedBubble
                ? "How often each bubble team makes the projected field when model weights are reasonably perturbed. Hover a logo for the scenario breakdown; click to open the team resume."
                : `The projected field is stable under ±${Math.round(sensitivity.perturbation_spec.relative_range * 100)}% weight perturbations. No team landed in the 25–75% bubble band for this run.`}
            </p>
          </CardHeader>
          <CardContent className="px-4">
            {hasContestedBubble ? (
              <SelectionStabilityBoard sensitivity={sensitivity} />
            ) : (
              <div className="flex flex-col gap-2">
                <SelectionStabilitySummary sensitivity={sensitivity} />
                <Collapsible>
                  <CollapsibleTrigger className="group inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                    View all stability scores
                    <ChevronDown
                      aria-hidden
                      className="h-3.5 w-3.5 transition-transform duration-200 group-data-[panel-open]:rotate-180"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-2">
                      <SelectionStabilityBoard
                        sensitivity={sensitivity}
                        showLegend={false}
                        showFootnote={false}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {displaced_team ? (
        <Card className="border-border bg-secondary/40">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <TeamLogoTile
              team={displaced_team.team}
              logoUrl={displaced_team.logo_url}
              abbreviation={displaced_team.abbreviation}
              primaryColor={displaced_team.primary_color}
              size={28}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {displaced_team.team}, displaced by an auto-bid champion
              </span>
              <span className="text-xs text-muted-foreground">
                This team ranked inside the field on composite score alone,
                but was pushed out when a lower-ranked conference champion
                claimed the final automatic bid.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BubbleColumn
          title="Last Four In"
          description="The four lowest-seeded at-large teams still inside the field."
          accent="blue"
          teams={last_four_in}
          cutLineScore={cutLineScore}
          isInField
        />
        <BubbleColumn
          title="First Four Out"
          description="The top of the bubble, closest to claiming the final at-large spot."
          accent="red"
          teams={first_four_out}
          cutLineScore={cutLineScore}
          isFirstOut
        />
        <BubbleColumn
          title="Next Four Out"
          description="Further down the board, but still in the conversation."
          accent="muted"
          teams={next_four_out}
          cutLineScore={cutLineScore}
        />
      </div>

      {last_four_in.length === 0 && first_four_out.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserX className="h-4 w-4" />
          No bubble data available for this run.
        </div>
      ) : null}
    </div>
  );
}
