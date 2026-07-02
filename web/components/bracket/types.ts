import type { BracketPod } from "@/lib/types";

/** Bracket page view modes, driven by the header ToggleGroup. */
export type BracketViewMode = "full" | "rounds" | "matchups";

export const BRACKET_VIEW_MODES: { value: BracketViewMode; label: string }[] = [
  { value: "full", label: "Full Bracket" },
  { value: "rounds", label: "Round View" },
  { value: "matchups", label: "Matchups" },
];

/** Pods grouped by which semifinal they feed, in seed order (top pod first). */
export function splitPodsBySide(pods: BracketPod[]): {
  top: BracketPod[];
  bottom: BracketPod[];
} {
  const bySeed = (a: BracketPod, b: BracketPod) =>
    (a.bye.seed ?? 99) - (b.bye.seed ?? 99);
  return {
    top: pods.filter((p) => p.semifinal_side === "top").sort(bySeed),
    bottom: pods.filter((p) => p.semifinal_side === "bottom").sort(bySeed),
  };
}
