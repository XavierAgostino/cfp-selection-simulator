import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "@trigger.dev/sdk";

function readTriggerProjectRef(): string {
  const fromEnv = process.env.TRIGGER_PROJECT_REF?.trim();
  if (fromEnv) return fromEnv;

  const refFile = path.join(process.cwd(), "trigger.project.ref");
  try {
    const fromFile = fs.readFileSync(refFile, "utf8").trim();
    if (fromFile) return fromFile;
  } catch {
    // missing file
  }

  throw new Error(
    "Trigger project ref missing. Set TRIGGER_PROJECT_REF in web/.env.hosted.local and run pnpm deploy:trigger.",
  );
}

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
