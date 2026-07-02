import type { Record_ } from "@/lib/types";

/** "0.866" — three decimals, always signed the same way, for composite/resume/etc scores. */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(3);
}

/** "11-1" from a { wins, losses } record. */
export function formatRecord(record: Record_ | null | undefined): string {
  if (!record) return "—";
  return `${record.wins}-${record.losses}`;
}

/**
 * Fallback initials for a team without a logo, e.g. "Notre Dame" -> "ND",
 * "Ole Miss" -> "OM". Prefers an explicit abbreviation when present.
 */
export function teamInitials(
  team: string,
  abbreviation?: string | null,
): string {
  if (abbreviation && abbreviation.trim().length > 0) {
    return abbreviation.trim().slice(0, 4).toUpperCase();
  }
  const words = team
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** "Dec 7, 2025" style date for generated-at / schedule timestamps. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** "Dec 7, 2025, 3:04 PM" for a fuller generated-at readout. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
