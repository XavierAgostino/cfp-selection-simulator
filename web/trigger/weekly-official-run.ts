import { schedules } from "@trigger.dev/sdk";

import { runWeeklyOfficialRun } from "@/lib/officialRun";

/**
 * Weekly official run — keeps the hosted catalog's default field current on its
 * own. Fires Tuesday 10pm ET, just after the CFP committee releases its weekly
 * rankings, and analyzes the latest committee week (auto-detected from CFBD).
 *
 * The timezone is pinned to America/New_York so the fire time tracks the
 * committee's release across the EST→EDT boundary (the CFP window is EST, but
 * pinning the zone keeps intent obvious and DST-proof).
 *
 * Dormant until `SELECTION_ROOM_OFFICIAL_RUN_ENABLED=1` — the schedule ships now
 * but launches nothing (and spends no CFBD quota) until the season is live. See
 * `web/lib/officialRun.ts` for the resolution logic and env knobs.
 */
export const weeklyOfficialRun = schedules.task({
  id: "weekly-official-run",
  cron: {
    pattern: "0 22 * * 2", // Tuesday 22:00
    timezone: "America/New_York",
  },
  maxDuration: 300,
  run: async () => {
    // Resolves the target, enqueues run-hosted-job, and returns immediately —
    // the heavy worker runs as its own task. Result is surfaced in the Trigger
    // dashboard for observability.
    return runWeeklyOfficialRun();
  },
});
