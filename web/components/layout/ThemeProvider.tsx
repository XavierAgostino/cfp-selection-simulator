"use client";

import type { ReactNode } from "react";
import { ThemeProvider as ThemeProviderBase } from "@/lib/color-scheme";

export { useTheme, type Theme } from "@/lib/color-scheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProviderBase defaultTheme="dark" disableTransitionOnChange>
      {children}
    </ThemeProviderBase>
  );
}
