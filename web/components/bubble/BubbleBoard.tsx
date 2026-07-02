import { UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleColumn } from "@/components/bubble/BubbleColumn";
import { TeamLogoTile } from "@/components/team/TeamLogoTile";
import type { FieldPayload } from "@/lib/types";

interface BubbleBoardProps {
  field: FieldPayload;
}

/** Three-column bubble board: Last Four In, First Four Out, Next Four Out — plus the displaced-team callout. */
export function BubbleBoard({ field }: BubbleBoardProps) {
  const { last_four_in, first_four_out, next_four_out, displaced_team } = field;
  const cutLineScore =
    last_four_in[last_four_in.length - 1]?.composite_score ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
        Selection Room fills the field with a{" "}
        <span className="font-medium text-foreground">5 + 7 model</span>: the
        five highest-ranked conference champions earn automatic bids, and the
        seven best remaining teams by composite score fill the at-large
        slots. Everything below is measured against the composite-score gap
        to that final at-large cutoff — the cut line.
      </div>

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
                {displaced_team.team} — displaced by an auto-bid champion
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
          description="The top of the bubble — closest to claiming the final at-large spot."
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
