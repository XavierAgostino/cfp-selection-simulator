"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { cn } from "@/lib/utils";

/** Routes whose primary artifact needs a wider canvas than the default reading column. */
const WIDE_CANVAS_ROUTES = ["/bracket"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wideCanvas = WIDE_CANVAS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 py-8",
        wideCanvas
          ? "max-w-none px-3 sm:px-4 md:px-5"
          : "max-w-6xl px-4 sm:px-6",
      )}
    >
      <PageBreadcrumbs />
      {children}
    </main>
  );
}
