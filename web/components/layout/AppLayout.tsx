"use client";

import type { ReactNode } from "react";
import { EspnGlobalHeader } from "@/components/layout/EspnGlobalHeader";

/** Top-level shell: sticky header + page content (no sidebar). */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <EspnGlobalHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
