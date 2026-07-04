#!/usr/bin/env node
/**
 * Deploy Trigger.dev tasks with env from web/.env.hosted.local (gitignored).
 * Writes web/.trigger-project-ref for remote build indexing. Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refFile = path.join(webRoot, "trigger.project.ref");

function writeTriggerProjectRef(projectRef) {
  fs.writeFileSync(refFile, `${projectRef.trim()}\n`, "utf8");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

const loadedHosted = loadEnvFile(path.join(webRoot, ".env.hosted.local"));
loadEnvFile(path.join(webRoot, ".env.local"));

const projectRef = process.env.TRIGGER_PROJECT_REF?.trim();
if (!projectRef) {
  console.error(
    loadedHosted
      ? "TRIGGER_PROJECT_REF is missing from web/.env.hosted.local"
      : "Missing web/.env.hosted.local — set TRIGGER_PROJECT_REF and TRIGGER_SECRET_KEY",
  );
  process.exit(1);
}

writeTriggerProjectRef(projectRef);

const subcommand = process.argv[2] === "dev" ? "dev" : "deploy";
const args = [
  "dlx",
  "trigger.dev@latest",
  subcommand,
  "--env-file",
  path.join(webRoot, ".env.hosted.local"),
  "--project-ref",
  projectRef,
];

const result = spawnSync("pnpm", args, {
  cwd: webRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
