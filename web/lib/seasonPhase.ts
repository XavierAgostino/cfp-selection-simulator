/**
 * Season phase — is the CFP selection window live right now?
 *
 * The product only has a live field to project once the committee starts
 * ranking (first Tuesday of November) and through the national championship
 * (mid-January). Outside that window there's no current field, so the dashboard
 * shows the prior season's *final* field and locks the live "Run Analysis"
 * action until the next season opens.
 *
 * This is a pure, date-driven function (no network, no CFBD quota). `RunHeader`
 * is a server component, so it recomputes every request — the UI flips itself on
 * the calendar with no redeploy. The *automated* weekly run still gates on
 * `SELECTION_ROOM_OFFICIAL_RUN_ENABLED` (see lib/officialRun.ts) by design.
 */

export type SeasonPhase = "offseason" | "live";

export interface SeasonWindow {
  phase: SeasonPhase;
  /** CFP season year for `now` (games run Aug–Jan, so Jan–Jul is the prior fall). */
  seasonYear: number;
  /** When the live window next opens — the first committee rankings (first Tue of Nov). */
  nextOpen: Date;
}

/** The first Tuesday of November (UTC) — when the committee publishes week 1. */
export function firstTuesdayOfNovember(year: number): Date {
  const nov1 = new Date(Date.UTC(year, 10, 1)); // month 10 = November
  const offsetToTuesday = (2 - nov1.getUTCDay() + 7) % 7; // 0 Sun … 2 Tue … 6 Sat
  return new Date(Date.UTC(year, 10, 1 + offsetToTuesday));
}

/**
 * Resolve the season phase for an instant. Live = November through Jan 20
 * (committee rankings → national championship); everything else is off-season.
 */
export function resolveSeasonPhase(now: Date = new Date()): SeasonWindow {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1–12
  const day = now.getUTCDate();

  const isLive = month === 11 || month === 12 || (month === 1 && day <= 20);
  const seasonYear = month >= 8 ? year : year - 1;

  const thisNov = firstTuesdayOfNovember(year);
  const nextOpen =
    now.getTime() < thisNov.getTime() ? thisNov : firstTuesdayOfNovember(year + 1);

  return { phase: isLive ? "live" : "offseason", seasonYear, nextOpen };
}
