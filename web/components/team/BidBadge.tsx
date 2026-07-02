import { Badge } from "@/components/ui/badge";
import { bidTypeStyles, firstOutStyle, outStyle } from "@/lib/theme";
import type { BidType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BidBadgeProps {
  bidType: BidType | null;
  /** True when this team is the highest-ranked team outside the field. */
  isFirstOut?: boolean;
  className?: string;
}

/** AUTO / AT-LARGE / FIRST OUT / OUT — label is self-explanatory; no tooltip needed. */
export function BidBadge({ bidType, isFirstOut, className }: BidBadgeProps) {
  const style = bidType
    ? bidTypeStyles[bidType]
    : isFirstOut
      ? firstOutStyle
      : outStyle;

  return (
    <Badge
      variant={style.variant}
      className={cn("cursor-default text-[0.65rem] tracking-wide", className)}
      title={style.description}
    >
      {style.label}
    </Badge>
  );
}
