/**
 * ScenarioDiffService — compares a base run against a weight-scenario run.
 *
 * `getScenarioDiff` is a pure function over the two runs' `rankings.json` and
 * `field.json` payloads; it does no IO. The API route (`/api/scenario/diff`)
 * reads the artifacts from disk and hands them here. The diff describes how the
 * 12-team field, seeds, bubble, and full-board ranks shift under the scenario
 * weights — never a probability or a prediction, only the projected reordering.
 */

import type {
  FieldPayload,
  RankingRow,
  RankingsPayload,
  TeamSlot,
} from "@/lib/types";
import type { ScenarioWeights } from "@/lib/scenarioWeights";

/** Minimal team identity + branding carried into every diff entry. */
export interface DiffTeam {
  team: string;
  abbreviation: string | null;
  conference: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

/** A team that entered or left the 12-team field under the scenario. */
export interface FieldMove extends DiffTeam {
  /** Seed in the run where the team is in the field (1–12), else null. */
  seed: number | null;
}

/** A team in both fields whose seed changed. */
export interface SeedChange extends DiffTeam {
  base_seed: number | null;
  scenario_seed: number | null;
  /** base_seed − scenario_seed; positive means the team moved up (lower seed). */
  delta: number;
}

/** A full-board rank movement (whether or not the team is in the field). */
export interface RankMove extends DiffTeam {
  base_rank: number;
  scenario_rank: number;
  /** base_rank − scenario_rank; positive means the team moved up the board. */
  delta: number;
  base_composite: number;
  scenario_composite: number;
}

export interface BubbleSide {
  last_four_in: Array<DiffTeam & { rank: number }>;
  first_four_out: Array<DiffTeam & { rank: number }>;
}

export interface ScenarioDiff {
  base_stem: string;
  scenario_stem: string;
  run_id: string;
  base_weights: ScenarioWeights | null;
  scenario_weights: ScenarioWeights | null;
  summary: {
    moved_in: number;
    moved_out: number;
    seed_changes: number;
    /** Teams whose full-board rank changed at all. */
    rank_changes: number;
  };
  moved_in: FieldMove[];
  moved_out: FieldMove[];
  seed_changes: SeedChange[];
  bubble: { base: BubbleSide; scenario: BubbleSide };
  /** Largest full-board rank movers, most-moved first. */
  rank_movers: RankMove[];
}

/** How many top rank movers to surface. */
const MAX_RANK_MOVERS = 12;

/** Extract the run_id (season_weekNN) from a run stem. */
export function runIdFromStem(stem: string): string {
  return stem.split("__")[0];
}

function toDiffTeam(row: RankingRow | TeamSlot): DiffTeam {
  return {
    team: row.team,
    abbreviation: row.abbreviation,
    conference: row.conference,
    logo_url: row.logo_url,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
  };
}

function seedByTeam(field: TeamSlot[]): Map<string, TeamSlot> {
  return new Map(field.map((slot) => [slot.team, slot]));
}

function bubbleSide(field: FieldPayload): BubbleSide {
  const toEntry = (slot: TeamSlot) => ({ ...toDiffTeam(slot), rank: slot.rank });
  return {
    last_four_in: field.last_four_in.map(toEntry),
    first_four_out: field.first_four_out.map(toEntry),
  };
}

export interface ScenarioDiffInput {
  baseStem: string;
  scenarioStem: string;
  baseRankings: RankingsPayload;
  scenarioRankings: RankingsPayload;
  baseField: FieldPayload;
  scenarioField: FieldPayload;
  baseWeights?: ScenarioWeights | null;
  scenarioWeights?: ScenarioWeights | null;
}

export function getScenarioDiff(input: ScenarioDiffInput): ScenarioDiff {
  const baseSeeds = seedByTeam(input.baseField.field);
  const scenarioSeeds = seedByTeam(input.scenarioField.field);

  // Field membership: who entered, who left.
  const moved_in: FieldMove[] = [];
  const moved_out: FieldMove[] = [];
  const seed_changes: SeedChange[] = [];

  for (const [team, slot] of scenarioSeeds) {
    if (!baseSeeds.has(team)) {
      moved_in.push({ ...toDiffTeam(slot), seed: slot.seed });
    }
  }
  for (const [team, slot] of baseSeeds) {
    if (!scenarioSeeds.has(team)) {
      moved_out.push({ ...toDiffTeam(slot), seed: slot.seed });
    } else {
      const scenarioSlot = scenarioSeeds.get(team)!;
      if (slot.seed !== scenarioSlot.seed) {
        seed_changes.push({
          ...toDiffTeam(slot),
          base_seed: slot.seed,
          scenario_seed: scenarioSlot.seed,
          delta: (slot.seed ?? 0) - (scenarioSlot.seed ?? 0),
        });
      }
    }
  }

  moved_in.sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
  moved_out.sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
  // Biggest seed swing first.
  seed_changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Full-board rank movement, keyed by team.
  const baseRankByTeam = new Map(
    input.baseRankings.teams.map((row) => [row.team, row]),
  );
  const rank_movers: RankMove[] = [];
  let rank_changes = 0;
  for (const scenarioRow of input.scenarioRankings.teams) {
    const baseRow = baseRankByTeam.get(scenarioRow.team);
    if (!baseRow) continue;
    const delta = baseRow.rank - scenarioRow.rank;
    if (delta === 0) continue;
    rank_changes += 1;
    rank_movers.push({
      ...toDiffTeam(scenarioRow),
      base_rank: baseRow.rank,
      scenario_rank: scenarioRow.rank,
      delta,
      base_composite: baseRow.composite_score,
      scenario_composite: scenarioRow.composite_score,
    });
  }
  rank_movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    base_stem: input.baseStem,
    scenario_stem: input.scenarioStem,
    run_id: runIdFromStem(input.baseStem),
    base_weights: input.baseWeights ?? null,
    scenario_weights: input.scenarioWeights ?? null,
    summary: {
      moved_in: moved_in.length,
      moved_out: moved_out.length,
      seed_changes: seed_changes.length,
      rank_changes,
    },
    moved_in,
    moved_out,
    seed_changes,
    bubble: {
      base: bubbleSide(input.baseField),
      scenario: bubbleSide(input.scenarioField),
    },
    rank_movers: rank_movers.slice(0, MAX_RANK_MOVERS),
  };
}
