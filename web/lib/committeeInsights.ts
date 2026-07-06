/**
 * Derivations over committee.json for the Validation page: first-round bye
 * agreement, a plain-English takeaway, and a taxonomy of model/committee
 * disagreements. Pure functions so the classification is testable and the
 * components stay declarative.
 *
 * The taxonomy deliberately names *kinds* of disagreement. "The model missed
 * Miami" is a weaker statement than "the model and committee swapped the last
 * at-large team": the first sounds like an error, the second says exactly
 * which judgment differed.
 */

import type {
  CommitteeComparisonPayload,
  CommitteeComparisonTeam,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// First-round byes (seeds 1-4)
// ---------------------------------------------------------------------------

export interface ByeComparison {
  /** Teams both sides gave a first-round bye. */
  matched: string[];
  committeeByes: string[];
  modelByes: string[];
  /** True when both sides seeded a full top four. */
  comparable: boolean;
}

const BYE_SEED_MAX = 4;

export function compareByes(payload: CommitteeComparisonPayload): ByeComparison {
  const committeeByes = payload.teams
    .filter((t) => t.committee_seed !== null && t.committee_seed <= BYE_SEED_MAX)
    .map((t) => t.team);
  const modelByes = payload.teams
    .filter((t) => t.model_seed !== null && t.model_seed <= BYE_SEED_MAX)
    .map((t) => t.team);
  const modelSet = new Set(modelByes);
  return {
    matched: committeeByes.filter((team) => modelSet.has(team)),
    committeeByes,
    modelByes,
    comparable:
      committeeByes.length === BYE_SEED_MAX && modelByes.length === BYE_SEED_MAX,
  };
}

// ---------------------------------------------------------------------------
// Miss taxonomy
// ---------------------------------------------------------------------------

export type MissKind =
  | "bubble_swap"
  | "seed_order"
  | "auto_bid_displacement"
  | "rule_era_difference"
  | "data_limitation";

export interface MissInstance {
  kind: MissKind;
  /** One plain sentence describing this specific instance. */
  detail: string;
  /** Teams involved, for drawer links. */
  teams: string[];
}

export interface MissTaxonomy {
  instances: MissInstance[];
  /** Instance count per kind (0 when clean). */
  counts: Record<MissKind, number>;
  /** Field teams both sides selected but seeded differently. */
  seedMismatches: CommitteeComparisonTeam[];
}

/** Static definitions for every kind, shown whether or not it occurred. */
export const MISS_KIND_DEFINITIONS: Array<{
  kind: MissKind;
  label: string;
  meaning: string;
}> = [
  {
    kind: "bubble_swap",
    label: "Bubble swap",
    meaning:
      "The model and committee disagree on the final at-large spot. A weighting judgment, not a rules failure.",
  },
  {
    kind: "seed_order",
    label: "Seed order",
    meaning:
      "Both sides selected the team; they placed it on a different seed line.",
  },
  {
    kind: "auto_bid_displacement",
    label: "Auto-bid displacement",
    meaning:
      "A field difference caused by a conference champion claiming an automatic bid on one side.",
  },
  {
    kind: "rule_era_difference",
    label: "Rule-era difference",
    meaning:
      "A selection affected by which playoff format applied (4-team vs 12-team, 2024 vs 2025 seeding). Only arises in historical replays.",
  },
  {
    kind: "data_limitation",
    label: "Data limitation",
    meaning:
      "Missing or incomplete reference data: an undocumented first team out, or fields that are not directly comparable.",
  },
];

export function classifyDisagreements(
  payload: CommitteeComparisonPayload,
): MissTaxonomy {
  const instances: MissInstance[] = [];

  const modelOnly = payload.teams.filter((t) => t.agreement === "model_only");
  const committeeOnly = payload.teams.filter(
    (t) => t.agreement === "committee_only",
  );

  // Auto-bid involvement first: a champion claiming a bid explains the swap
  // structurally, so it outranks the generic bubble-swap label.
  const autoModel = modelOnly.filter((t) => t.model_bid_type === "auto");
  const autoCommittee = committeeOnly.filter(
    (t) => t.committee_bid_type === "auto",
  );
  for (const t of [...autoModel, ...autoCommittee]) {
    instances.push({
      kind: "auto_bid_displacement",
      detail: `${t.team} holds an automatic bid on one side of the comparison.`,
      teams: [t.team],
    });
  }

  // Remaining field differences pair off as at-large bubble swaps.
  const swapModel = modelOnly.filter((t) => t.model_bid_type !== "auto");
  const swapCommittee = committeeOnly.filter(
    (t) => t.committee_bid_type !== "auto",
  );
  const pairs = Math.min(swapModel.length, swapCommittee.length);
  for (let i = 0; i < pairs; i += 1) {
    instances.push({
      kind: "bubble_swap",
      detail: `The model takes ${swapModel[i].team}; the committee selected ${swapCommittee[i].team}.`,
      teams: [swapModel[i].team, swapCommittee[i].team],
    });
  }

  // Same team, different seed line.
  const seedMismatches = payload.teams.filter(
    (t) =>
      t.agreement === "both_in" &&
      t.model_seed !== null &&
      t.committee_seed !== null &&
      t.model_seed !== t.committee_seed,
  );
  if (seedMismatches.length > 0) {
    instances.push({
      kind: "seed_order",
      detail: `${seedMismatches.length} field team${
        seedMismatches.length === 1 ? "" : "s"
      } seeded on a different line (${seedMismatches
        .map((t) => t.team)
        .join(", ")}).`,
      teams: seedMismatches.map((t) => t.team),
    });
  }

  if (!payload.field_comparable) {
    instances.push({
      kind: "data_limitation",
      detail:
        "The two fields are different sizes, so field-level counts are not directly comparable.",
      teams: [],
    });
  }
  if (payload.summary.committee_first_team_out === null) {
    instances.push({
      kind: "data_limitation",
      detail: "The committee's first team out is not documented for this season.",
      teams: [],
    });
  }

  const counts: Record<MissKind, number> = {
    bubble_swap: 0,
    seed_order: 0,
    auto_bid_displacement: 0,
    rule_era_difference: 0,
    data_limitation: 0,
  };
  for (const instance of instances) counts[instance.kind] += 1;

  return { instances, counts, seedMismatches };
}

// ---------------------------------------------------------------------------
// Takeaway
// ---------------------------------------------------------------------------

export interface CommitteeTakeaway {
  season: number;
  overlapCount: number;
  fieldSize: number;
  byes: ByeComparison;
  modelOnly: CommitteeComparisonTeam[];
  committeeOnly: CommitteeComparisonTeam[];
  /**
   * The headline character of the field disagreement:
   * none (exact match), bubble_swap, auto_bid_displacement, or mixed.
   */
  character: "none" | "bubble_swap" | "auto_bid_displacement" | "mixed";
}

export function buildTakeaway(
  payload: CommitteeComparisonPayload,
): CommitteeTakeaway {
  const taxonomy = classifyDisagreements(payload);
  const modelOnly = payload.teams.filter((t) => t.agreement === "model_only");
  const committeeOnly = payload.teams.filter(
    (t) => t.agreement === "committee_only",
  );

  let character: CommitteeTakeaway["character"] = "none";
  if (modelOnly.length > 0 || committeeOnly.length > 0) {
    const hasSwap = taxonomy.counts.bubble_swap > 0;
    const hasAuto = taxonomy.counts.auto_bid_displacement > 0;
    character =
      hasSwap && hasAuto
        ? "mixed"
        : hasAuto
          ? "auto_bid_displacement"
          : "bubble_swap";
  }

  return {
    season: payload.season,
    overlapCount: payload.summary.field_overlap_count,
    fieldSize: payload.summary.committee_field_size,
    byes: compareByes(payload),
    modelOnly,
    committeeOnly,
    character,
  };
}
