import { PUBLIC_DEMO_BANNER, isDemoMode } from "@/lib/demoMode";

/** Site-wide notice for the read-only public demo deployment. */
export function DemoModeBanner() {
  if (!isDemoMode) return null;

  return (
    <div
      role="status"
      className="border-b border-border/60 bg-secondary/50 px-4 py-2 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm"
    >
      {PUBLIC_DEMO_BANNER}
    </div>
  );
}
