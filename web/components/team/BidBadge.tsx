"use client";

import { Badge } from "@/components/ui/badge";
import { BadgeTooltip } from "@/components/explain/InfoTooltip";
import { bidTypeStyles, firstOutStyle, outStyle } from "@/lib/theme";
import type { ExplainBadgeKey } from "@/lib/explain";
import type { BidType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BidBadgeProps {
  bidType: BidType | null;
  /** True when this team is the highest-ranked team outside the field. */
  isFirstOut?: boolean;
  className?: string;
}

/** AUTO / AT-LARGE / FIRST OUT / OUT status chip with its centralized explanation on hover. */
export function BidBadge({ bidType, isFirstOut, className }: BidBadgeProps) {
  const style = bidType
    ? bidTypeStyles[bidType]
    : isFirstOut
      ? firstOutStyle
      : outStyle;
  const badgeKey: ExplainBadgeKey = bidType ?? (isFirstOut ? "first_out" : "out");

  return (
    <BadgeTooltip badge={badgeKey}>
      <Badge
        variant={style.variant}
        className={cn("cursor-default text-[0.65rem] tracking-wide", className)}
      >
        {style.label}
      </Badge>
    </BadgeTooltip>
  );
}
