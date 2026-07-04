import { defineConfig } from "@trigger.dev/sdk";

import { readTriggerProjectRef } from "./lib/trigger-project-ref";

export default defineConfig({
  project: readTriggerProjectRef(),
  dirs: ["./trigger"],
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
});
