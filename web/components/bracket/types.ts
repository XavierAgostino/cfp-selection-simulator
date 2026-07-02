import type { BracketPod, TeamSlot } from "@/lib/types";

/** Bracket page view modes, driven by the header ToggleGroup. */
export type BracketViewMode = "full" | "rounds" | "matchups";

/**
 * CFP pod mental model: each first-round game feeds a specific bye seed.
 * Pod A: 8/9 → 1 · Pod B: 5/12 → 4 · Pod C: 6/11 → 3 · Pod D: 7/10 → 2.
 */
const POD_LETTER_BY_BYE_SEED: Record<number, string> = { 1: "A", 4: "B", 3: "C", 2: "D" };

export interface PodMeta {
  /** Pod letter (A–D), derived from which bye seed the pod feeds. */
  letter: string;
  /** Seed math for the pod, e.g. "8/9 → 1". */
  formula: string;
}

export function podMeta(pod: BracketPod): PodMeta {
  const [a, b] = pod.first_round;
  const byeSeed = pod.bye.seed;
  return {
    letter: (byeSeed !== null && POD_LETTER_BY_BYE_SEED[byeSeed]) || pod.quarterfinal_id,
    formula: `${a?.seed ?? "?"}/${b?.seed ?? "?"} → ${byeSeed ?? "?"}`,
  };
}

/** First-round games are played on campus: the better (lower-number) seed hosts. */
export function firstRoundHost(teamA: TeamSlot, teamB: TeamSlot): TeamSlot {
  return (teamA.seed ?? 99) <= (teamB.seed ?? 99) ? teamA : teamB;
}

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
