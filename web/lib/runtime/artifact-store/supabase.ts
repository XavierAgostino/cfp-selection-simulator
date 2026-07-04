import { HostedConfigurationError } from "@/lib/runtime/errors";
import type { ArtifactStore } from "@/lib/runtime/artifact-store/types";
import type { SupabaseStorageBackend } from "@/lib/runtime/artifact-store/supabase-types";
import { validateArtifactKey } from "@/lib/runtime/artifact-store/validate-key";

function decodeUtf8(body: Uint8Array): string {
  return new TextDecoder("utf-8").decode(body);
}

export class SupabaseArtifactStore implements ArtifactStore {
  constructor(private readonly backend: SupabaseStorageBackend) {}

  async readText(key: string): Promise<string | null> {
    if (!validateArtifactKey(key)) return null;
    const { body, notFound } = await this.backend.downloadObject(key);
    if (notFound || body === null) return null;
    return decodeUtf8(body);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const text = await this.readText(key);
    if (text === null) return null;
    return JSON.parse(text) as T;
  }

  async putJson(key: string, data: unknown): Promise<void> {
    void key;
    void data;
    throw new HostedConfigurationError(
      "Supabase Storage artifact writes require the hosted worker (H5). " +
        "Upload objects manually for H3 read-path testing.",
    );
  }

  async exists(key: string): Promise<boolean> {
    if (!validateArtifactKey(key)) return false;
    const { body, notFound } = await this.backend.downloadObject(key);
    return !notFound && body !== null;
  }

  async list(prefix: string): Promise<string[]> {
    if (prefix.includes("..") || prefix.includes("\0")) return [];
    const folder = prefix.replace(/\/$/, "");
    const { names } = await this.backend.listObjects(folder);
    const keys = names
      .filter((name) => name.endsWith(".json"))
      .map((name) => (folder ? `${folder}/${name}` : name))
      .filter((key) => validateArtifactKey(key));
    return keys.sort();
  }
}
