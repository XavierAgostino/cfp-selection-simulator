"use client";

import type { ReactNode } from "react";
import { EspnGlobalHeader } from "@/components/layout/EspnGlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

/** Top-level shell: sticky header + page content + footer (no sidebar). */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <EspnGlobalHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <GlobalFooter />
    </div>
  );
}
