import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AppIconProps = {
  icon: LucideIcon;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

/** Lucide icons at app scale — the single icon primitive for chrome and nav. */
export function AppIcon({
  icon: Icon,
  className,
  size = 18,
  strokeWidth = 2,
}: AppIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
