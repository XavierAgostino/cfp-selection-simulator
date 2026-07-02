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
  variant: ChipVariant;
}

/** Visual treatment only — explanation copy lives in lib/explain.ts. */
export const bidTypeStyles: Record<BidType, BidTypeStyle> = {
  auto: { label: "AUTO", variant: "chip-red" },
  at_large: { label: "AT-LARGE", variant: "chip-neutral" },
};

export const firstOutStyle: BidTypeStyle = {
  label: "FIRST OUT",
  variant: "chip-gold",
};

export const outStyle: BidTypeStyle = {
  label: "OUT",
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
