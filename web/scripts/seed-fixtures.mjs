// Copies lib/fixtures/*.json into the API data directory (creating it if needed)
// so the app has live data to render before the Python exporter has run.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../lib/fixtures");
const DEST =
  process.env.SELECTION_ROOM_DATA_DIR ??
  path.resolve(__dirname, "../../data/output/api");

const PER_RUN_KINDS = [
  "rankings",
  "field",
  "bracket",
  "audit",
  "team-resumes",
  "sensitivity",
  "committee",
];

fs.mkdirSync(DEST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".json"));
for (const file of files) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
  console.log(`seeded ${file} -> ${path.relative(process.cwd(), path.join(DEST, file))}`);
}

const runsIndex = JSON.parse(fs.readFileSync(path.join(SRC, "runs.json"), "utf-8"));
const stems = (runsIndex.runs ?? []).map((run) => run.stem).filter(Boolean);

if (stems.length === 0) {
  console.warn("runs.json has no runs — skipping per-run seed");
} else {
  for (const stem of stems) {
    const runDir = path.join(DEST, "runs", stem);
    fs.mkdirSync(runDir, { recursive: true });
    for (const kind of PER_RUN_KINDS) {
      const file = `${kind}.json`;
      const sourcePath = path.join(SRC, file);
      if (!fs.existsSync(sourcePath)) {
        console.warn(`skip ${stem}/${file} — missing fixture ${file}`);
        continue;
      }
      fs.copyFileSync(sourcePath, path.join(runDir, file));
      console.log(
        `seeded ${file} -> ${path.relative(process.cwd(), path.join(runDir, file))}`,
      );
    }
  }
}

console.log(`\nSeeded ${files.length} fixture files into ${DEST}`);
console.log(`Per-run copies for: ${stems.join(", ") || "(none)"}`);
