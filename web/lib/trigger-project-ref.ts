import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refFile = path.join(webRoot, "trigger.project.ref");

/** Project ref is not secret; persisted for Trigger remote builds. */
export function readTriggerProjectRef(): string {
  const fromEnv = process.env.TRIGGER_PROJECT_REF?.trim();
  if (fromEnv) return fromEnv;

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

export function writeTriggerProjectRef(projectRef: string): void {
  fs.writeFileSync(refFile, `${projectRef.trim()}\n`, "utf8");
}
