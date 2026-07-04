import { createHash, timingSafeEqual } from "crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time string compare via SHA-256 digests. */
export function timingSafeEqualString(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function getConfiguredBetaCodes(): string[] {
  const multi = process.env.SELECTION_ROOM_BETA_RUN_CODES?.trim();
  if (multi) {
    return multi
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);
  }

  const single = process.env.SELECTION_ROOM_BETA_ACCESS_CODE?.trim();
  if (single) return [single];

  return [];
}

export function isBetaAccessConfigured(): boolean {
  return getConfiguredBetaCodes().length > 0;
}

export function validateBetaAccessCode(provided: string | null | undefined): boolean {
  if (!provided?.trim()) return false;

  const codes = getConfiguredBetaCodes();
  if (codes.length === 0) return false;

  for (const code of codes) {
    if (timingSafeEqualString(provided, code)) {
      return true;
    }
  }
  return false;
}

export function extractBetaCode(
  headers: { get(name: string): string | null },
  body: Record<string, unknown>,
): string | null {
  const headerValue = headers.get("x-selection-room-beta-code")?.trim();
  if (headerValue) return headerValue;

  const bodyValue = body.beta_code;
  if (typeof bodyValue === "string" && bodyValue.trim()) {
    return bodyValue.trim();
  }

  return null;
}
