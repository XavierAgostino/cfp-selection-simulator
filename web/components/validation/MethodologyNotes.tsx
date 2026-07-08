import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Short disclaimer stays visible; the full caveat stack collapses. Shared by the
 * Committee Tendencies section so the final-fit card and the weekly tracker no
 * longer each carry an identical methodology block (they render from the same
 * disclaimer_short + caveats copy).
 */
export function MethodologyNotes({
  disclaimerShort,
  caveats,
}: {
  disclaimerShort: string;
  caveats: string[];
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {disclaimerShort}
      </p>
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDown
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-180"
          />
          Methodology notes
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1 pt-2">
            {caveats.map((caveat) => (
              <p
                key={caveat}
                className="max-w-3xl text-xs leading-relaxed text-muted-foreground"
              >
                {caveat}
              </p>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
