/** True when the public read-only demo is deployed (Vercel, no local engine). */
export const isDemoMode =
  process.env.NEXT_PUBLIC_SELECTION_ROOM_DEMO_MODE === "1";

export const PUBLIC_DEMO_BANNER_BADGE = "Public beta";

export const PUBLIC_DEMO_BANNER_MESSAGE =
  "Read-only demo with bundled 2025 Week 15 sample data.";

export const PUBLIC_DEMO_BANNER_MESSAGE_SHORT = "Bundled sample data only.";

export const PUBLIC_DEMO_BANNER_CTA = "Run locally";

export const PUBLIC_DEMO_BANNER_HREF = "/docs/getting-started";

export const PUBLIC_DEMO_BANNER_DISMISS_KEY =
  "selection-room-demo-banner-dismissed";

export const PUBLIC_DEMO_RUN_ANALYSIS_NOTE =
  "Run Analysis is available in local open-source mode only. Clone the repo and run make demo to generate your own runs.";

export const PUBLIC_DEMO_SCENARIO_LAUNCH_NOTE =
  "This public demo runs on bundled artifacts. Launching new scenarios requires the local engine. Clone the repo to run make demo and sroom run with custom weights.";
