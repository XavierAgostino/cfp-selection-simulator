import type { WeekDefaultsResponse } from "@/app/api/run/week-defaults/route";

export const FINAL_SELECTION_WEEK = 16;
export const PRE_FINAL_SELECTION_WEEK = 15;

/**
 * First week the CFP committee publishes rankings (early November). Weeks before
 * this have no selection meaning, so the Run Analysis picker starts here rather
 * than at week 1.
 */
export const SELECTION_WINDOW_START_WEEK = 10;

/** Client-side label when API labels are not loaded yet. */
export function weekOptionLabelFallback(week: number): string {
  if (week === FINAL_SELECTION_WEEK) {
    return "Week 16 · Final selection window";
  }
  if (week === PRE_FINAL_SELECTION_WEEK) {
    return "Week 15 · Championship weekend · final field";
  }
  return `Week ${week}`;
}

export function weekOptionLabel(
  week: number,
  labels?: Record<string, string> | null,
): string {
  const fromApi = labels?.[String(week)];
  return fromApi ?? weekOptionLabelFallback(week);
}

export async function fetchWeekDefaults(
  season: number,
  dataSource: "sample" | "live",
): Promise<WeekDefaultsResponse> {
  const apiSource = dataSource === "live" ? "cfbd" : "sample";
  const res = await fetch(
    `/api/run/week-defaults?season=${season}&data_source=${apiSource}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error("week_defaults_unavailable");
  }
  return (await res.json()) as WeekDefaultsResponse;
}
