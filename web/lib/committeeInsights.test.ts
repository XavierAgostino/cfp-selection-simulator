import { describe, expect, it } from "vitest";
import {
  buildTakeaway,
  classifyDisagreements,
  compareByes,
} from "@/lib/committeeInsights";
import type {
  BidType,
  CommitteeAgreement,
  CommitteeComparisonPayload,
  CommitteeComparisonTeam,
} from "@/lib/types";

function team(
  name: string,
  overrides: Partial<CommitteeComparisonTeam> = {},
): CommitteeComparisonTeam {
  return {
    team: name,
    abbreviation: null,
    conference: null,
    logo_url: null,
    primary_color: null,
    model_rank: null,
    committee_rank: null,
    rank_delta: null,
    model_in_field: false,
    committee_in_field: false,
    model_seed: null,
    committee_seed: null,
    model_bid_type: null,
    committee_bid_type: null,
    agreement: "both_out" as CommitteeAgreement,
    ...overrides,
  };
}

function inBoth(
  name: string,
  seedModel: number,
  seedCommittee: number,
  bid: BidType = "at_large",
): CommitteeComparisonTeam {
  return team(name, {
    model_in_field: true,
    committee_in_field: true,
    model_seed: seedModel,
    committee_seed: seedCommittee,
    model_bid_type: bid,
    committee_bid_type: bid,
    agreement: "both_in",
  });
}

function payload(
  teams: CommitteeComparisonTeam[],
  overrides: Partial<CommitteeComparisonPayload> = {},
): CommitteeComparisonPayload {
  const modelField = teams.filter((t) => t.model_in_field).length;
  const committeeField = teams.filter((t) => t.committee_in_field).length;
  const overlap = teams.filter(
    (t) => t.model_in_field && t.committee_in_field,
  ).length;
  return {
    schema_version: 1,
    season: 2025,
    week: 15,
    ruleset: "cfp12_2025" as CommitteeComparisonPayload["ruleset"],
    generated_at: "2026-01-01T00:00:00Z",
    reference: "final",
    reference_label: "Final 2025 CFP committee rankings",
    source_note: "test fixture",
    field_comparable: modelField === committeeField,
    summary: {
      committee_field_size: committeeField,
      model_field_size: modelField,
      field_overlap_count: overlap,
      field_overlap_ratio: committeeField > 0 ? overlap / committeeField : 0,
      model_only_field: teams
        .filter((t) => t.agreement === "model_only")
        .map((t) => t.team),
      committee_only_field: teams
        .filter((t) => t.agreement === "committee_only")
        .map((t) => t.team),
      model_first_team_out: "BYU",
      committee_first_team_out: "Notre Dame",
      seed_exact_matches: null,
    },
    teams,
    ...overrides,
  };
}

/** A 2025-shaped fixture: 12-team fields, one at-large swap (ND vs Miami). */
function swapPayload(): CommitteeComparisonPayload {
  const agreed = [
    inBoth("Oregon", 1, 1, "auto"),
    inBoth("Georgia", 2, 2, "auto"),
    inBoth("Boise State", 3, 4, "auto"),
    inBoth("Arizona State", 4, 3, "auto"),
    inBoth("Texas", 5, 5),
    inBoth("Penn State", 6, 6),
    inBoth("Ohio State", 7, 8),
    inBoth("Tennessee", 8, 7),
    inBoth("Indiana", 9, 10),
    inBoth("SMU", 10, 11),
    inBoth("Clemson", 11, 12, "auto"),
  ];
  const modelOnly = team("Notre Dame", {
    model_in_field: true,
    model_seed: 12,
    model_bid_type: "at_large",
    agreement: "model_only",
  });
  const committeeOnly = team("Miami", {
    committee_in_field: true,
    committee_seed: 9,
    committee_bid_type: "at_large",
    agreement: "committee_only",
  });
  return payload([...agreed, modelOnly, committeeOnly, team("BYU")]);
}

describe("compareByes", () => {
  it("matches bye sets by team, not by seed number", () => {
    const byes = compareByes(swapPayload());
    expect(byes.comparable).toBe(true);
    expect(byes.committeeByes).toHaveLength(4);
    expect(byes.modelByes).toHaveLength(4);
    // Boise State and Arizona State swap the 3/4 lines but both still hold byes.
    expect(byes.matched).toHaveLength(4);
  });

  it("reports non-comparable when a side lacks a full top four", () => {
    const byes = compareByes(
      payload([inBoth("Oregon", 1, 1, "auto"), inBoth("Georgia", 2, 2, "auto")]),
    );
    expect(byes.comparable).toBe(false);
  });
});

describe("classifyDisagreements", () => {
  it("classifies an at-large field disagreement as one bubble swap", () => {
    const taxonomy = classifyDisagreements(swapPayload());
    expect(taxonomy.counts.bubble_swap).toBe(1);
    expect(taxonomy.counts.auto_bid_displacement).toBe(0);
    expect(taxonomy.counts.data_limitation).toBe(0);
    const swap = taxonomy.instances.find((m) => m.kind === "bubble_swap");
    expect(swap?.teams).toEqual(["Notre Dame", "Miami"]);
  });

  it("counts seed-order mismatches among agreed field teams", () => {
    const taxonomy = classifyDisagreements(swapPayload());
    // Boise/ASU swap 3-4, Ohio State/Tennessee swap 7-8, Indiana 9-10,
    // SMU 10-11, Clemson 11-12.
    expect(taxonomy.counts.seed_order).toBe(1);
    const seedMiss = taxonomy.instances.find((m) => m.kind === "seed_order");
    expect(taxonomy.seedMismatches).toHaveLength(7);
    expect(seedMiss?.detail).toContain("7 field teams");
  });

  it("classifies auto-bid field differences as displacement, not bubble swap", () => {
    const modelOnly = team("Boise State", {
      model_in_field: true,
      model_seed: 12,
      model_bid_type: "auto",
      agreement: "model_only",
    });
    const committeeOnly = team("Miami", {
      committee_in_field: true,
      committee_seed: 12,
      committee_bid_type: "at_large",
      agreement: "committee_only",
    });
    const taxonomy = classifyDisagreements(
      payload([inBoth("Oregon", 1, 1, "auto"), modelOnly, committeeOnly]),
    );
    expect(taxonomy.counts.auto_bid_displacement).toBe(1);
    expect(taxonomy.counts.bubble_swap).toBe(0);
  });

  it("flags missing committee first-team-out as a data limitation", () => {
    const p = swapPayload();
    p.summary.committee_first_team_out = null;
    const taxonomy = classifyDisagreements(p);
    expect(taxonomy.counts.data_limitation).toBe(1);
  });

  it("flags non-comparable fields as a data limitation", () => {
    const p = swapPayload();
    p.field_comparable = false;
    const taxonomy = classifyDisagreements(p);
    expect(taxonomy.counts.data_limitation).toBe(1);
  });

  it("returns zero instances for a perfect match", () => {
    const taxonomy = classifyDisagreements(
      payload([
        inBoth("Oregon", 1, 1, "auto"),
        inBoth("Georgia", 2, 2, "auto"),
      ]),
    );
    expect(taxonomy.instances).toHaveLength(0);
  });
});

describe("buildTakeaway", () => {
  it("summarizes the 2025-shaped run as a single bubble swap", () => {
    const takeaway = buildTakeaway(swapPayload());
    expect(takeaway.season).toBe(2025);
    expect(takeaway.overlapCount).toBe(11);
    expect(takeaway.fieldSize).toBe(12);
    expect(takeaway.byes.matched).toHaveLength(4);
    expect(takeaway.modelOnly.map((t) => t.team)).toEqual(["Notre Dame"]);
    expect(takeaway.committeeOnly.map((t) => t.team)).toEqual(["Miami"]);
    expect(takeaway.character).toBe("bubble_swap");
  });

  it("reports character none when the fields match exactly", () => {
    const takeaway = buildTakeaway(
      payload([inBoth("Oregon", 1, 1, "auto"), inBoth("Georgia", 2, 2, "auto")]),
    );
    expect(takeaway.character).toBe("none");
  });
});
