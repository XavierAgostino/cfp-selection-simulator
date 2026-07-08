import type { ReactNode } from "react";
import { EspnGlobalHeader } from "@/components/layout/EspnGlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

/** Top-level shell: sticky header + page content + footer (no sidebar). */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <EspnGlobalHeader />
      <div
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col focus:outline-none"
      >
        {children}
      </div>
      <GlobalFooter />
    </div>
  );
}
