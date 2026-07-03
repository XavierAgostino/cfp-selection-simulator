import type { RankingRow, SelectionCase, TeamResume } from "@/lib/types";

function synthesizeSelectionCase(row: RankingRow): SelectionCase {
  const reasons = [`Ranked #${row.rank} by the composite model.`];
  const concerns: string[] = [];

  if (row.in_field) {
    if (row.bid_type === "auto") {
      const conf = row.champion_of ?? row.conference ?? "conference";
      reasons.push(`Automatic bid as ${conf} champion.`);
    } else if (row.bid_type === "at_large") {
      reasons.push("Selected as one of the seven at-large teams.");
      reasons.push("Finished above the final at-large cutoff.");
    } else {
      reasons.push("Projected in the 12-team field under this ruleset.");
    }
    if (row.seed != null) {
      reasons.push(`Playoff seed #${row.seed} under this ruleset.`);
    }
    return {
      status: "selected",
      headline: "Projected selection",
      reasons,
      concerns,
    };
  }

  reasons.push("Outside the projected CFP field under this ruleset.");
  reasons.push(
    "Detailed schedule notes are available for projected field and bubble teams.",
  );
  return {
    status: "summary",
    headline: "Selection summary",
    reasons,
    concerns,
  };
}

/** Minimal summary resume from rankings.json when team-resumes.json lacks an entry. */
export function synthesizeSummaryResume(row: RankingRow): TeamResume {
  const selectionCase = synthesizeSelectionCase(row);
  return {
    team: row.team,
    abbreviation: row.abbreviation,
    conference: row.conference,
    logo_url: row.logo_url,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    rank: row.rank,
    seed: row.seed,
    bid_type: row.bid_type,
    in_field: row.in_field,
    is_conference_champion: row.is_conference_champion,
    champion_of: row.champion_of,
    record: row.record,
    scores: {
      composite: row.composite_score,
      resume: row.resume_score,
      predictive: row.predictive_score,
      sor: row.sor,
      sos: row.sos,
    },
    component_ranks: {
      resume: row.rank,
      predictive: row.rank,
      sor: row.rank,
      sos: row.rank,
    },
    detail_level: "summary",
    selection_case: selectionCase,
    why_in: selectionCase.reasons,
    concerns: selectionCase.concerns,
    schedule: [],
  };
}
