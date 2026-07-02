import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LucideAppIconProps = {
  icon: LucideIcon;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/** Lucide icons tuned for sidebar-scale UI on dark backgrounds. */
export function LucideAppIcon({
  icon: Icon,
  className,
  size = 18,
  strokeWidth = 2,
}: LucideAppIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
