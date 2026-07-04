/** Reject path traversal and non-JSON artifact keys. */
export function validateArtifactKey(key: string): boolean {
  if (!key.endsWith(".json")) return false;
  if (key.includes("..") || key.includes("\0")) return false;
  const segments = key.split("/");
  return segments.every((segment) => segment.length > 0 && !segment.includes(".."));
}
