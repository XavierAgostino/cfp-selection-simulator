import { promises as fs } from "fs";
import path from "path";

import type { ArtifactStore } from "@/lib/runtime/artifact-store/types";
import { validateArtifactKey } from "@/lib/runtime/artifact-store/validate-key";

export class FilesystemArtifactStore implements ArtifactStore {
  constructor(private readonly rootDir: string) {}

  private resolvePath(key: string): string | null {
    if (!validateArtifactKey(key)) return null;
    const resolvedRoot = path.resolve(this.rootDir);
    const filePath = path.resolve(resolvedRoot, key);
    if (
      filePath !== resolvedRoot &&
      !filePath.startsWith(resolvedRoot + path.sep)
    ) {
      return null;
    }
    return filePath;
  }

  async readText(key: string): Promise<string | null> {
    const filePath = this.resolvePath(key);
    if (!filePath) return null;
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ENOENT"
      ) {
        return null;
      }
      throw err;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const text = await this.readText(key);
    if (text === null) return null;
    return JSON.parse(text) as T;
  }

  async putJson(key: string, data: unknown): Promise<void> {
    const filePath = this.resolvePath(key);
    if (!filePath) {
      throw new Error(`invalid_artifact_key:${key}`);
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    if (!filePath) return false;
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    if (prefix.includes("..") || prefix.includes("\0")) return [];
    const resolvedRoot = path.resolve(this.rootDir);
    const dirPath = path.resolve(resolvedRoot, prefix);
    if (
      dirPath !== resolvedRoot &&
      !dirPath.startsWith(resolvedRoot + path.sep)
    ) {
      return [];
    }
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const keys: string[] = [];
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        const relative = prefix
          ? `${prefix.replace(/\/$/, "")}/${entry.name}`
          : entry.name;
        if (validateArtifactKey(relative)) keys.push(relative);
      }
      return keys.sort();
    } catch {
      return [];
    }
  }
}
