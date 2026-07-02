import type { BidType } from "@/lib/types";

/**
 * Selection Room brand accents. These mirror the CSS custom properties
 * defined in app/globals.css (--accent-red, --accent-gold, etc.) so
 * components can either use the Tailwind utility classes (bg-accent-red)
 * or reach for a raw value in inline styles / SVG / Recharts.
 */
export const brandColor = {
  red: "#D7263D",
  gold: "#D4AF37",
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
} as const;

export interface BidTypeStyle {
  label: string;
  description: string;
  className: string;
}

/** Bid type -> label, tooltip copy, and Tailwind classes for BidBadge. */
export const bidTypeStyles: Record<BidType, BidTypeStyle> = {
  auto: {
    label: "AUTO",
    description: "Earned an automatic bid as a conference champion.",
    className: "bg-accent-red/15 text-accent-red border-accent-red/30",
  },
  at_large: {
    label: "AT-LARGE",
    description: "Selected at-large based on overall resume ranking.",
    className: "bg-accent-blue/15 text-accent-blue border-accent-blue/30",
  },
};

export const firstOutStyle: BidTypeStyle = {
  label: "FIRST OUT",
  description: "First team left out of the field — the top of the bubble.",
  className: "bg-accent-amber/15 text-accent-amber border-accent-amber/30",
};

export const outStyle: BidTypeStyle = {
  label: "OUT",
  description: "Outside the field under the current rankings.",
  className: "bg-muted text-muted-foreground border-border",
};

/** Seed chip styling — gold for the top-4 bye seeds, neutral otherwise. */
export function seedChipClassName(seed: number | null, isBye: boolean): string {
  if (seed === null) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (isBye) {
    return "bg-accent-gold/15 text-accent-gold border-accent-gold/30";
  }
  return "bg-secondary text-foreground border-border";
}
