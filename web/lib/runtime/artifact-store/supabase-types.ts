/** Minimal storage surface for SupabaseArtifactStore (mockable in tests). */
export interface SupabaseStorageBackend {
  downloadObject(path: string): Promise<{ body: Uint8Array | null; notFound: boolean }>;
  listObjects(prefix: string): Promise<{ names: string[] }>;
}

export interface SupabaseStorageConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}
