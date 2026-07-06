import { describe, expect, it } from "vitest";

import {
  firstTuesdayOfNovember,
  resolveSeasonPhase,
} from "@/lib/seasonPhase";

const at = (iso: string) => new Date(iso);

describe("firstTuesdayOfNovember", () => {
  it("finds the first Tuesday of November", () => {
    // Nov 1 2026 is a Sunday → first Tuesday is the 3rd.
    expect(firstTuesdayOfNovember(2026).toISOString()).toBe(
      "2026-11-03T00:00:00.000Z",
    );
    // Nov 1 2025 is a Saturday → first Tuesday is the 4th.
    expect(firstTuesdayOfNovember(2025).toISOString()).toBe(
      "2025-11-04T00:00:00.000Z",
    );
  });
});

describe("resolveSeasonPhase", () => {
  it("is live from November through the championship (mid-January)", () => {
    expect(resolveSeasonPhase(at("2026-11-15T12:00:00Z")).phase).toBe("live");
    expect(resolveSeasonPhase(at("2026-12-20T12:00:00Z")).phase).toBe("live");
    expect(resolveSeasonPhase(at("2027-01-10T12:00:00Z")).phase).toBe("live");
  });

  it("is off-season the rest of the year, including the early season", () => {
    expect(resolveSeasonPhase(at("2026-07-06T12:00:00Z")).phase).toBe("offseason");
    expect(resolveSeasonPhase(at("2026-09-01T12:00:00Z")).phase).toBe("offseason");
    expect(resolveSeasonPhase(at("2027-01-25T12:00:00Z")).phase).toBe("offseason");
  });

  it("attributes Jan–Jul to the prior fall's season", () => {
    expect(resolveSeasonPhase(at("2026-07-06T12:00:00Z")).seasonYear).toBe(2025);
    expect(resolveSeasonPhase(at("2026-09-01T12:00:00Z")).seasonYear).toBe(2026);
  });

  it("points nextOpen at the upcoming committee week", () => {
    expect(
      resolveSeasonPhase(at("2026-07-06T12:00:00Z")).nextOpen.toISOString(),
    ).toBe("2026-11-03T00:00:00.000Z");
    // Deep in a live window, the next opening rolls to next November.
    expect(
      resolveSeasonPhase(at("2026-12-01T12:00:00Z")).nextOpen.toISOString(),
    ).toBe("2027-11-02T00:00:00.000Z");
  });
});
