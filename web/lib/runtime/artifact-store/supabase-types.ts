/** Minimal storage surface for SupabaseArtifactStore (mockable in tests). */
export interface SupabaseStorageBackend {
  downloadObject(path: string): Promise<{ body: Uint8Array | null; notFound: boolean }>;
  uploadObject(path: string, body: Uint8Array, contentType: string): Promise<void>;
  listObjects(prefix: string): Promise<{ names: string[] }>;
}

export interface SupabaseStorageConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}
