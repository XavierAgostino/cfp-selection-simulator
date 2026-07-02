"use client";

import { useSearchParams } from "next/navigation";

/**
 * The active run stem from the page's ?run= query param, or null for the
 * latest run. Client-side counterpart of the `stem` prop server pages pass
 * around, so client components (drawer, hover cards) stay scoped to the run
 * the user is actually viewing.
 */
export function useActiveRun(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get("run");
}
