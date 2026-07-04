#!/usr/bin/env node
/**
 * Deploy Trigger.dev tasks with env from web/.env.hosted.local (gitignored).
 * Syncs trigger-project.ts from TRIGGER_PROJECT_REF before upload. Does not print secrets.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectTs = path.join(webRoot, "trigger-project.ts");

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

function writeTriggerProjectTs(projectRef) {
  fs.writeFileSync(
    projectTs,
    `// Project ref from Trigger dashboard (not secret). Updated by pnpm deploy:trigger.\nexport const TRIGGER_PROJECT_REF = ${JSON.stringify(projectRef.trim())};\n`,
    "utf8",
  );
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

writeTriggerProjectTs(projectRef);

/** Local-only keys replaced on Trigger deploy (never use local machine paths). */
const TRIGGER_ENV_CLOUD_OVERRIDES = {
  SELECTION_ROOM_PYTHON: "/opt/venv/bin/python",
};

function writeTriggerDeployEnvFile(sourcePath) {
  const lines = fs.readFileSync(sourcePath, "utf8").split("\n");
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (key in TRIGGER_ENV_CLOUD_OVERRIDES) {
      out.push(`${key}=${TRIGGER_ENV_CLOUD_OVERRIDES[key]}`);
      seen.add(key);
      continue;
    }
    if (key === "SELECTION_ROOM_REPO_DIR" || key === "NEXT_PUBLIC_SITE_URL") {
      out.push(`# ${line} (local-only; omitted from Trigger deploy)`);
      continue;
    }
    out.push(line);
    seen.add(key);
  }
  for (const [key, value] of Object.entries(TRIGGER_ENV_CLOUD_OVERRIDES)) {
    if (!seen.has(key)) {
      out.push(`${key}=${value}`);
    }
  }
  const dest = path.join(webRoot, ".env.trigger-deploy");
  fs.writeFileSync(dest, `${out.join("\n").trimEnd()}\n`, "utf8");
  return dest;
}

const hostedEnvPath = path.join(webRoot, ".env.hosted.local");
const triggerEnvPath = writeTriggerDeployEnvFile(hostedEnvPath);

function stageMonorepoForTrigger() {
  const stageRoot = path.join(webRoot, "_trigger-worker");
  fs.rmSync(stageRoot, { recursive: true, force: true });
  fs.mkdirSync(stageRoot, { recursive: true });
  fs.cpSync(path.join(webRoot, "../src"), path.join(stageRoot, "src"), { recursive: true });
  fs.cpSync(path.join(webRoot, "../data"), path.join(stageRoot, "data"), { recursive: true });
}

if (process.argv[2] !== "dev") {
  stageMonorepoForTrigger();
}

const subcommand = process.argv[2] === "dev" ? "dev" : "deploy";
const args = [
  "dlx",
  "trigger.dev@latest",
  subcommand,
  "--env-file",
  triggerEnvPath,
  "--project-ref",
  projectRef,
];

const result = spawnSync("pnpm", args, {
  cwd: webRoot,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
