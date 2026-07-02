import type { BidType } from "@/lib/types";

/**
 * Selection Room brand accents. Mirrors CSS custom properties in app/globals.css.
 * ESPN broadcast palette: red primary, gold for byes/champs, neutrals elsewhere.
 */
export const brandColor = {
  red: "#CC0000",
  gold: "#FFB81C",
  blue: "#8B949E",
  green: "#6B7280",
  amber: "#C9A227",
  logoSurface: "#F5F5F5",
} as const;

export type ChipVariant = "chip-neutral" | "chip-red" | "chip-gold" | "chip-green";

export interface BidTypeStyle {
  label: string;
  description: string;
  variant: ChipVariant;
}

export const bidTypeStyles: Record<BidType, BidTypeStyle> = {
  auto: {
    label: "AUTO",
    description: "Earned an automatic bid as a conference champion.",
    variant: "chip-red",
  },
  at_large: {
    label: "AT-LARGE",
    description: "Selected at-large based on overall resume ranking.",
    variant: "chip-neutral",
  },
};

export const firstOutStyle: BidTypeStyle = {
  label: "FIRST OUT",
  description: "First team left out of the field — the top of the bubble.",
  variant: "chip-gold",
};

export const outStyle: BidTypeStyle = {
  label: "OUT",
  description: "Outside the field under the current rankings.",
  variant: "chip-neutral",
};

export function seedChipVariant(seed: number | null, isBye: boolean): ChipVariant {
  if (seed === null) {
    return "chip-neutral";
  }
  if (isBye) {
    return "chip-gold";
  }
  return "chip-neutral";
}
