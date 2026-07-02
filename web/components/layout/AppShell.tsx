"use client";

import type { ReactNode } from "react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <PageBreadcrumbs />
      {children}
    </main>
  );
}
