import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { bidTypeStyles, firstOutStyle, outStyle } from "@/lib/theme";
import type { BidType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BidBadgeProps {
  bidType: BidType | null;
  /** True when this team is the highest-ranked team outside the field. */
  isFirstOut?: boolean;
  className?: string;
}

/** AUTO / AT-LARGE / FIRST OUT / OUT, each with a tooltip explaining the rule. */
export function BidBadge({ bidType, isFirstOut, className }: BidBadgeProps) {
  const style = bidType
    ? bidTypeStyles[bidType]
    : isFirstOut
      ? firstOutStyle
      : outStyle;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            className={cn(
              "cursor-default font-mono text-[0.65rem] tracking-wide",
              style.className,
              className,
            )}
          >
            {style.label}
          </Badge>
        }
      />
      <TooltipContent>{style.description}</TooltipContent>
    </Tooltip>
  );
}
