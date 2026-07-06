#!/usr/bin/env node
/**
 * Seed the hosted deployment with the official sample runs so a fresh visitor
 * browses real data with zero setup — the same experience the standalone demo
 * project used to provide, but served by the one hosted product.
 *
 * What it does (idempotent):
 *   1. Uploads every JSON artifact under data/output/api/ to Supabase Storage,
 *      preserving relative keys (root indexes, root "latest" flat copies that the
 *      default stem=null views read, and per-run runs/<stem>/ copies).
 *   2. Upserts a `runs` row per entry in runs.json, carrying weights/flags in
 *      manifest_json and setting created_at from the run's generated_at so the
 *      catalog's latest_stem matches runs.json.
 *
 * Reads web/.env.hosted.local (gitignored) for the hosted Supabase credentials.
 *
 *   node scripts/seed-hosted-catalog.mjs            # seed (upsert only)
 *   node scripts/seed-hosted-catalog.mjs --dry-run  # preview, write nothing
 *   node scripts/seed-hosted-catalog.mjs --prune    # seed, then delete catalog
 *                                                    # rows + Storage runs/<stem>/
 *                                                    # prefixes absent from runs.json
 *                                                    # (opt-in — syncs prod to the
 *                                                    #  exact set in runs.json)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postgres = require(path.join(root, "web/node_modules/postgres"));
const { createClient } = require(
  path.join(root, "web/node_modules/@supabase/supabase-js"),
);

const dryRun = process.argv.includes("--dry-run");
const prune = process.argv.includes("--prune");
const envPath = path.join(root, "web", ".env.hosted.local");
const dataDir =
  process.env.SELECTION_ROOM_DATA_DIR ?? path.join(root, "data", "output", "api");

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function die(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  die("Missing web/.env.hosted.local — run ./scripts/bootstrap-hosted-env.sh first.");
}
loadEnv(envPath);

if (!fs.existsSync(dataDir)) {
  die(
    `No exported data at ${dataDir}. Run "pnpm --dir web seed-fixtures" or the ` +
      "Python exporter (sroom run ... --export-api) to populate it.",
  );
}

const databaseUrl = process.env.SELECTION_ROOM_DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = (process.env.SUPABASE_STORAGE_BUCKET ?? "artifacts").trim() || "artifacts";

if (!databaseUrl) die("SELECTION_ROOM_DATABASE_URL missing from web/.env.hosted.local");
if (!supabaseUrl) die("SUPABASE_URL missing from web/.env.hosted.local");
if (!serviceRoleKey) die("SUPABASE_SERVICE_ROLE_KEY missing from web/.env.hosted.local");

/** All .json files under dir, returned as keys relative to dataDir (posix). */
function collectJsonKeys(dir, base = dir) {
  const keys = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      keys.push(...collectJsonKeys(abs, base));
    } else if (entry.name.endsWith(".json")) {
      keys.push(path.relative(base, abs).split(path.sep).join("/"));
    }
  }
  return keys;
}

function artifactBaseUrl(stem) {
  return `supabase://${bucket}/runs/${stem}/`;
}

async function main() {
  const storageKeys = collectJsonKeys(dataDir).sort();
  const runsIndex = JSON.parse(
    fs.readFileSync(path.join(dataDir, "runs.json"), "utf8"),
  );
  const runs = Array.isArray(runsIndex.runs) ? runsIndex.runs : [];

  const keepStems = runs.map((run) => run.stem);
  // Guard: pruning against an empty index would wipe the whole catalog.
  if (prune && keepStems.length === 0) {
    die("--prune refused: runs.json lists zero runs (would delete everything).");
  }

  const modeLabel = dryRun ? " (dry run)" : prune ? " (prune)" : "";
  console.log(`Selection Room — seed hosted catalog${modeLabel}`);
  console.log(`  data dir : ${dataDir}`);
  console.log(`  bucket   : ${bucket}`);
  console.log(`  artifacts: ${storageKeys.length} JSON files`);
  console.log(`  runs     : ${runs.length} (latest ${runsIndex.latest?.stem ?? "?"})`);

  if (dryRun) {
    console.log("\nWould upload:");
    for (const key of storageKeys) console.log(`  ↑ ${key}`);
    console.log("\nWould upsert runs:");
    for (const run of runs) {
      console.log(`  • ${run.stem}  (${run.label ?? run.scenario_id})`);
    }
    if (prune) {
      console.log(
        "\nWould prune (live-only, requires a connection to enumerate): any " +
          "catalog row + runs/<stem>/ Storage prefix whose stem is NOT one of:",
      );
      for (const stem of keepStems) console.log(`  ✓ keep ${stem}`);
    }
    console.log("\nDry run — nothing written.");
    return;
  }

  let prunedRows = 0;
  let prunedFiles = 0;

  // 1. Upload artifacts to Supabase Storage.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let uploaded = 0;
  for (const key of storageKeys) {
    const body = fs.readFileSync(path.join(dataDir, key));
    const { error } = await supabase.storage.from(bucket).upload(key, body, {
      contentType: "application/json",
      upsert: true,
    });
    if (error) {
      if (/bucket not found/i.test(error.message)) {
        die(
          `Storage bucket "${bucket}" not found. Create it (private) in Supabase ` +
            "or apply supabase/migrations/20250704181500_hosted_artifacts_bucket.sql.",
        );
      }
      die(`Upload failed for ${key}: ${error.message}`);
    }
    uploaded += 1;
    process.stdout.write(`\r  uploaded ${uploaded}/${storageKeys.length}`);
  }
  process.stdout.write("\n");

  // 2. Upsert runs rows (manifest_json carries weights + has_bracket/has_sensitivity).
  const sql = postgres(databaseUrl, { prepare: false });
  try {
    for (const run of runs) {
      const source = run.data_source === "cfbd" ? "cfbd" : "sample";
      await sql`
        INSERT INTO runs (
          stem, season, week, source, ruleset, scenario_id, label,
          config_hash, artifact_base_url, manifest_json, created_at
        ) VALUES (
          ${run.stem}, ${run.season}, ${run.week}, ${source},
          ${run.ruleset ?? null}, ${run.scenario_id ?? "base"},
          ${run.label ?? null}, ${run.config_hash ?? null},
          ${artifactBaseUrl(run.stem)},
          ${sql.json(run)},
          ${run.generated_at ?? new Date().toISOString()}
        )
        ON CONFLICT (stem) DO UPDATE SET
          season = EXCLUDED.season,
          week = EXCLUDED.week,
          source = EXCLUDED.source,
          ruleset = EXCLUDED.ruleset,
          scenario_id = EXCLUDED.scenario_id,
          label = EXCLUDED.label,
          config_hash = EXCLUDED.config_hash,
          artifact_base_url = EXCLUDED.artifact_base_url,
          manifest_json = EXCLUDED.manifest_json,
          created_at = EXCLUDED.created_at
      `;
      console.log(`  • upserted ${run.stem}`);
    }

    // 3. Optional prune: drop catalog rows for stems no longer in runs.json.
    if (prune) {
      const existing = await sql`SELECT stem FROM runs`;
      const staleStems = existing
        .map((row) => row.stem)
        .filter((stem) => !keepStems.includes(stem));
      if (staleStems.length === 0) {
        console.log("  • prune: catalog already matches runs.json");
      } else {
        await sql`DELETE FROM runs WHERE stem = ANY(${staleStems})`;
        prunedRows = staleStems.length;
        for (const stem of staleStems) console.log(`  • pruned row ${stem}`);
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  // 4. Optional prune: remove Storage runs/<stem>/ prefixes for stale stems.
  if (prune) {
    const { data: runDirs, error } = await supabase.storage
      .from(bucket)
      .list("runs");
    if (error) die(`Prune: could not list runs/ in Storage: ${error.message}`);
    for (const dir of runDirs ?? []) {
      if (keepStems.includes(dir.name)) continue;
      const { data: files } = await supabase.storage
        .from(bucket)
        .list(`runs/${dir.name}`);
      const paths = (files ?? []).map((f) => `runs/${dir.name}/${f.name}`);
      if (paths.length === 0) continue;
      const { error: rmError } = await supabase.storage.from(bucket).remove(paths);
      if (rmError) die(`Prune: failed to remove runs/${dir.name}/: ${rmError.message}`);
      prunedFiles += paths.length;
      console.log(`  • pruned Storage runs/${dir.name}/ (${paths.length} files)`);
    }
  }

  const pruneNote = prune
    ? ` Pruned ${prunedRows} row(s) + ${prunedFiles} Storage file(s).`
    : "";
  console.log(
    `\n✓ Seeded ${uploaded} artifacts + ${runs.length} runs.${pruneNote} ` +
      "Hosted deployment now browses the current run set.",
  );
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));
