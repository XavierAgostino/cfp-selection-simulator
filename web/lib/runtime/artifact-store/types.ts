/** Logical artifact keys mirror data/output/api/ layout (e.g. runs.json, runs/{stem}/rankings.json). */
export interface ArtifactStore {
  readText(key: string): Promise<string | null>;
  getJson<T>(key: string): Promise<T | null>;
  putJson(key: string, data: unknown): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
}
