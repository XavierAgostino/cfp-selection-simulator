import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { FilesystemArtifactStore } from "@/lib/runtime/artifact-store/filesystem";
import { validateArtifactKey } from "@/lib/runtime/artifact-store/validate-key";

describe("validateArtifactKey", () => {
  it("accepts valid json keys", () => {
    expect(validateArtifactKey("runs.json")).toBe(true);
    expect(validateArtifactKey("runs/2025_week15/rankings.json")).toBe(true);
  });

  it("rejects traversal and non-json keys", () => {
    expect(validateArtifactKey("../runs.json")).toBe(false);
    expect(validateArtifactKey("runs/../latest.json")).toBe(false);
    expect(validateArtifactKey("runs.txt")).toBe(false);
  });
});

describe("FilesystemArtifactStore", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it("round-trips json artifacts", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "sroom-artifacts-"));
    const store = new FilesystemArtifactStore(tempDir);
    const payload = { ok: true, count: 2 };

    await store.putJson("runs/2025_week15/rankings.json", payload);
    expect(await store.exists("runs/2025_week15/rankings.json")).toBe(true);
    expect(await store.getJson("runs/2025_week15/rankings.json")).toEqual(payload);

    const raw = await readFile(
      path.join(tempDir, "runs/2025_week15/rankings.json"),
      "utf-8",
    );
    expect(JSON.parse(raw)).toEqual(payload);
  });
});
