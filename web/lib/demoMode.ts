/** True when the public read-only demo is deployed (Vercel, no local engine). */
export const isDemoMode =
  process.env.NEXT_PUBLIC_SELECTION_ROOM_DEMO_MODE === "1";

export const PUBLIC_DEMO_BANNER =
  "Public demo — explore bundled sample data. Run your own analyses locally with the open-source engine.";

export const PUBLIC_DEMO_RUN_ANALYSIS_NOTE =
  "Run Analysis is available in local open-source mode only. Clone the repo and run make demo to generate your own runs.";

export const PUBLIC_DEMO_SCENARIO_LAUNCH_NOTE =
  "This public demo shows the transparent baseline model on bundled artifacts. Launching new scenarios requires the local engine — clone the repo to run make demo and sroom run with custom weights.";
