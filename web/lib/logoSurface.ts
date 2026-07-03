import { cn } from "@/lib/utils";

/**
 * Shared circular backing for full-color league/team marks (ESPN broadcast style).
 * Keeps multi-color logos readable on light and dark UI surfaces.
 */
export function logoSurfaceFrameClass(className?: string): string {
  return cn(
    "flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-logo-surface p-0.5",
    className,
  );
}

/** Gold ring for conference-champion logo marks. */
export function championLogoRingClass(className?: string): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full p-px ring-2 ring-tag-gold-border/80 ring-offset-1 ring-offset-background",
    className,
  );
}
