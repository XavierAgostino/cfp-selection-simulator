import { additionalFiles } from "@trigger.dev/build/extensions/core";
import { pythonExtension } from "@trigger.dev/python/extension";
import { defineConfig } from "@trigger.dev/sdk";

import { TRIGGER_PROJECT_REF } from "./trigger-project";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF?.trim() || TRIGGER_PROJECT_REF,
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
  build: {
    extensions: [
      additionalFiles({
        files: ["./_trigger-worker/src/**", "./_trigger-worker/data/**"],
      }),
      pythonExtension({
        requirementsFile: "../requirements-worker.txt",
      }),
    ],
  },
});
