// Copies ../data/output/api -> public/data, for a future static deploy where
// the app is served without the Node route handler (e.g. a static export).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC =
  process.env.SELECTION_ROOM_DATA_DIR ??
  path.resolve(__dirname, "../../data/output/api");
const DEST = path.resolve(__dirname, "../public/data");

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith(".json")) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`No data directory at ${SRC} — run "pnpm seed-fixtures" or the Python exporter first.`);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
copyRecursive(SRC, DEST);
console.log(`Synced ${SRC} -> ${DEST}`);
