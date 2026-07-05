import { describe, expect, it } from "vitest";

import {
  detectLatestCommitteeWeek,
  latestCommitteeWeek,
  officialRunEnabled,
  resolveOfficialRunTarget,
  resolveOfficialSeason,
  resolveOfficialSource,
  runWeeklyOfficialRun,
} from "@/lib/officialRun";

/** Minimal fetch stub — returns a fixed JSON body for the rankings lookup. */
function fakeFetch(body: unknown, init: { ok?: boolean; status?: number } = {}): typeof fetch {
  return (async () =>
    ({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    })) as unknown as typeof fetch;
}

const rankingsFixture = [
  { week: 10, polls: [{ poll: "AP Top 25" }, { poll: "Playoff Committee Rankings" }] },
  { week: 12, polls: [{ poll: "Playoff Committee Rankings" }] },
  { week: 11, polls: [{ poll: "Playoff Committee Rankings" }] },
  { week: 13, polls: [{ poll: "Coaches Poll" }] }, // no committee poll → ignored
];

describe("officialRunEnabled", () => {
  it("is off by default and for falsey values", () => {
    expect(officialRunEnabled({})).toBe(false);
    expect(officialRunEnabled({ SELECTION_ROOM_OFFICIAL_RUN_ENABLED: "0" })).toBe(false);
    expect(officialRunEnabled({ SELECTION_ROOM_OFFICIAL_RUN_ENABLED: "false" })).toBe(false);
  });

  it("is on for truthy values", () => {
    for (const v of ["1", "true", "yes", "on", "TRUE"]) {
      expect(officialRunEnabled({ SELECTION_ROOM_OFFICIAL_RUN_ENABLED: v })).toBe(true);
    }
  });
});

describe("resolveOfficialSource", () => {
  it("defaults to cfbd and honors sample", () => {
    expect(resolveOfficialSource({})).toBe("cfbd");
    expect(resolveOfficialSource({ SELECTION_ROOM_OFFICIAL_RUN_SOURCE: "sample" })).toBe("sample");
    expect(resolveOfficialSource({ SELECTION_ROOM_OFFICIAL_RUN_SOURCE: "cfbd" })).toBe("cfbd");
  });
});

describe("resolveOfficialSeason", () => {
  it("maps Aug–Dec to the current year", () => {
    expect(resolveOfficialSeason({}, new Date("2026-11-24T03:00:00Z"))).toBe(2026);
    expect(resolveOfficialSeason({}, new Date("2026-08-30T12:00:00Z"))).toBe(2026);
  });

  it("maps Jan–Jul back to the prior fall (playoff spills into January)", () => {
    expect(resolveOfficialSeason({}, new Date("2027-01-19T03:00:00Z"))).toBe(2026);
    expect(resolveOfficialSeason({}, new Date("2026-07-05T00:00:00Z"))).toBe(2025);
  });

  it("honors an explicit override year and ignores 'auto'", () => {
    const now = new Date("2026-07-05T00:00:00Z");
    expect(resolveOfficialSeason({ SELECTION_ROOM_OFFICIAL_RUN_SEASON: "2024" }, now)).toBe(2024);
    expect(resolveOfficialSeason({ SELECTION_ROOM_OFFICIAL_RUN_SEASON: "auto" }, now)).toBe(2025);
  });
});

describe("latestCommitteeWeek", () => {
  it("returns the max week carrying a committee poll", () => {
    expect(latestCommitteeWeek(rankingsFixture)).toBe(12);
  });

  it("returns null when no committee poll is present", () => {
    expect(latestCommitteeWeek([{ week: 5, polls: [{ poll: "AP Top 25" }] }])).toBeNull();
    expect(latestCommitteeWeek([])).toBeNull();
    expect(latestCommitteeWeek(null)).toBeNull();
    expect(latestCommitteeWeek("nope")).toBeNull();
  });
});

describe("detectLatestCommitteeWeek", () => {
  it("parses the CFBD payload", async () => {
    const week = await detectLatestCommitteeWeek(2024, "key", fakeFetch(rankingsFixture));
    expect(week).toBe(12);
  });

  it("throws on a non-OK response", async () => {
    await expect(
      detectLatestCommitteeWeek(2024, "key", fakeFetch({}, { ok: false, status: 429 })),
    ).rejects.toThrow(/429/);
  });
});

describe("resolveOfficialRunTarget", () => {
  const now = new Date("2026-11-24T03:00:00Z"); // 2026 season, mid-committee window

  it("uses a valid explicit week without hitting CFBD", async () => {
    const { target, reason } = await resolveOfficialRunTarget({
      env: { SELECTION_ROOM_OFFICIAL_RUN_WEEK: "14", CFBD_API_KEY: "key" },
      now,
      fetchImpl: fakeFetch([], { ok: false, status: 500 }), // must not be called
    });
    expect(reason).toBeNull();
    expect(target).toEqual({ season: 2026, week: 14, source: "cfbd" });
  });

  it("rejects an out-of-range explicit week", async () => {
    const { target, reason } = await resolveOfficialRunTarget({
      env: { SELECTION_ROOM_OFFICIAL_RUN_WEEK: "99", CFBD_API_KEY: "key" },
      now,
    });
    expect(target).toBeNull();
    expect(reason).toMatch(/Invalid SELECTION_ROOM_OFFICIAL_RUN_WEEK/);
  });

  it("auto-detects the committee week from CFBD", async () => {
    const { target } = await resolveOfficialRunTarget({
      env: { CFBD_API_KEY: "key" },
      now,
      fetchImpl: fakeFetch(rankingsFixture),
    });
    expect(target).toEqual({ season: 2026, week: 12, source: "cfbd" });
  });

  it("skips when no committee poll exists yet", async () => {
    const { target, reason } = await resolveOfficialRunTarget({
      env: { CFBD_API_KEY: "key" },
      now,
      fetchImpl: fakeFetch([{ week: 5, polls: [{ poll: "AP Top 25" }] }]),
    });
    expect(target).toBeNull();
    expect(reason).toMatch(/No committee rankings/);
  });

  it("requires a key for auto detection", async () => {
    const { target, reason } = await resolveOfficialRunTarget({ env: {}, now });
    expect(target).toBeNull();
    expect(reason).toMatch(/CFBD_API_KEY/);
  });

  it("requires an explicit week in sample mode", async () => {
    const { target, reason } = await resolveOfficialRunTarget({
      env: { SELECTION_ROOM_OFFICIAL_RUN_SOURCE: "sample" },
      now,
    });
    expect(target).toBeNull();
    expect(reason).toMatch(/Sample source/);
  });

  it("allows sample mode with an explicit week", async () => {
    const { target } = await resolveOfficialRunTarget({
      env: { SELECTION_ROOM_OFFICIAL_RUN_SOURCE: "sample", SELECTION_ROOM_OFFICIAL_RUN_WEEK: "6" },
      now,
    });
    expect(target).toEqual({ season: 2026, week: 6, source: "sample" });
  });

  it("reports a CFBD failure as a skip reason", async () => {
    const { target, reason } = await resolveOfficialRunTarget({
      env: { CFBD_API_KEY: "key" },
      now,
      fetchImpl: fakeFetch({}, { ok: false, status: 500 }),
    });
    expect(target).toBeNull();
    expect(reason).toMatch(/Committee week lookup failed/);
  });
});

describe("runWeeklyOfficialRun", () => {
  it("short-circuits to skipped when disabled (no DB access)", async () => {
    const result = await runWeeklyOfficialRun({ env: {} });
    expect(result.status).toBe("skipped");
    expect(result.reason).toMatch(/disabled/);
  });
});
