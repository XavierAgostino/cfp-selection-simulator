"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

type AppIconProps = {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Hugeicons at app scale — crisp strokes on dark backgrounds. */
export function AppIcon({
  icon,
  size = 18,
  strokeWidth = 1.75,
  className,
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
