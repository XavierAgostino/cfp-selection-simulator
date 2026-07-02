"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 4000;

/**
 * Polls runs.json until the first pipeline run lands, then refreshes the
 * server-rendered tree so FirstRunGate swaps the wizard out for the real app.
 */
export function DataPoller() {
  const router = useRouter();
  const [found, setFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch("/api/data/runs.json", { cache: "no-store" });
        if (!cancelled && res.ok) {
          window.clearInterval(timer);
          setFound(true);
          router.refresh();
        }
      } catch {
        // Network hiccup — keep polling.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 text-sm text-muted-foreground"
    >
      {found ? (
        <>
          <span className="h-2 w-2 rounded-full bg-result-win" aria-hidden />
          Run detected — loading your field…
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Watching for your first run — this page updates automatically.
        </>
      )}
    </div>
  );
}
