import { describe, expect, it, vi } from "vitest";

import { SupabaseArtifactStore } from "@/lib/runtime/artifact-store/supabase";
import type { SupabaseStorageBackend } from "@/lib/runtime/artifact-store/supabase-types";

function mockBackend(
  overrides: Partial<SupabaseStorageBackend> = {},
): SupabaseStorageBackend {
  return {
    downloadObject: vi.fn(async () => ({ body: null, notFound: true })),
    uploadObject: vi.fn(async () => undefined),
    listObjects: vi.fn(async () => ({ names: [] })),
    ...overrides,
  };
}

describe("SupabaseArtifactStore", () => {
  it("returns parsed JSON for existing objects", async () => {
    const payload = { schema_version: 1, stem: "2025_week15" };
    const backend = mockBackend({
      downloadObject: vi.fn(async (path: string) => {
        expect(path).toBe("runs.json");
        return {
          body: new TextEncoder().encode(JSON.stringify(payload)),
          notFound: false,
        };
      }),
    });

    const store = new SupabaseArtifactStore(backend);
    await expect(store.getJson("runs.json")).resolves.toEqual(payload);
  });

  it("returns null for missing objects", async () => {
    const store = new SupabaseArtifactStore(mockBackend());
    await expect(store.getJson("latest.json")).resolves.toBeNull();
    await expect(store.readText("latest.json")).resolves.toBeNull();
  });

  it("rejects invalid artifact keys without calling storage", async () => {
    const backend = mockBackend();
    const store = new SupabaseArtifactStore(backend);
    await expect(store.readText("../runs.json")).resolves.toBeNull();
    expect(backend.downloadObject).not.toHaveBeenCalled();
  });

  it("lists json keys under a prefix", async () => {
    const backend = mockBackend({
      listObjects: vi.fn(async (prefix: string) => {
        expect(prefix).toBe("runs/2025_week15");
        return { names: ["rankings.json", "field.json", "notes.txt"] };
      }),
    });

    const store = new SupabaseArtifactStore(backend);
    await expect(store.list("runs/2025_week15")).resolves.toEqual([
      "runs/2025_week15/field.json",
      "runs/2025_week15/rankings.json",
    ]);
  });

  it("uploads JSON via putJson", async () => {
    const backend = mockBackend({
      uploadObject: vi.fn(async (path: string, body: Uint8Array, contentType: string) => {
        expect(path).toBe("runs.json");
        expect(contentType).toBe("application/json");
        expect(new TextDecoder().decode(body)).toContain('"schema_version"');
      }),
    });

    const store = new SupabaseArtifactStore(backend);
    await store.putJson("runs.json", { schema_version: 1 });
    expect(backend.uploadObject).toHaveBeenCalledOnce();
  });
});
