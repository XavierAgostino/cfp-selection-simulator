import type { ReactNode } from "react";

/**
 * Mounts a share card off-screen (real layout, no paint in the viewport) so
 * html-to-image can capture it at its natural design width. Render only while
 * an export is in flight.
 */
export function OffscreenExportLayer({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-[-100000px]"
    >
      {children}
    </div>
  );
}
