import type { WeekDefaultsResponse } from "@/app/api/run/week-defaults/route";

export const FINAL_SELECTION_WEEK = 16;
export const PRE_FINAL_SELECTION_WEEK = 15;

/** Client-side label when API labels are not loaded yet. */
export function weekOptionLabelFallback(week: number): string {
  if (week === FINAL_SELECTION_WEEK) {
    return "Week 16 · Final selection window";
  }
  if (week === PRE_FINAL_SELECTION_WEEK) {
    return "Week 15 · Pre-final / championship window";
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
