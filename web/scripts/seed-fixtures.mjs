// Copies lib/fixtures/*.json into ../data/output/api/ (creating it if needed)
// so the app has live data to render before the Python exporter has run.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../lib/fixtures");
const DEST =
  process.env.SELECTION_ROOM_DATA_DIR ??
  path.resolve(__dirname, "../../data/output/api");

fs.mkdirSync(DEST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".json"));
for (const file of files) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
  console.log(`seeded ${file} -> ${path.relative(process.cwd(), path.join(DEST, file))}`);
}

// Also seed a per-run copy under runs/{stem}/ so getRunFile(stem, kind) works.
const latest = JSON.parse(fs.readFileSync(path.join(SRC, "latest.json"), "utf-8"));
const runDir = path.join(DEST, "runs", latest.stem);
fs.mkdirSync(runDir, { recursive: true });
for (const kind of ["rankings", "field", "bracket", "audit", "team-resumes"]) {
  const file = `${kind}.json`;
  fs.copyFileSync(path.join(SRC, file), path.join(runDir, file));
  console.log(`seeded ${file} -> ${path.relative(process.cwd(), path.join(runDir, file))}`);
}

console.log(`\nSeeded ${files.length} fixture files into ${DEST}`);
