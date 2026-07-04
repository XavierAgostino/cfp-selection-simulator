"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/theme-bootstrap";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeListeners = new Set<() => void>();

function subscribeToTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  return () => {
    themeListeners.delete(onStoreChange);
  };
}

function notifyThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light") return "light";
    return "dark";
  } catch {
    return "dark";
  }
}

function applyThemeClass(theme: Theme, disableTransition: boolean) {
  const root = document.documentElement;
  let removeTransitionGuard: (() => void) | undefined;

  if (disableTransition) {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    removeTransitionGuard = () => {
      window.getComputedStyle(document.body);
      setTimeout(() => {
        style.remove();
      }, 1);
    };
  }

  root.classList.toggle("dark", theme === "dark");
  removeTransitionGuard?.();
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  disableTransitionOnChange = false,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    () => defaultTheme,
  );

  const setTheme = useCallback(
    (next: Theme) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      } catch {
        // Storage may be unavailable in private mode.
      }
      applyThemeClass(next, disableTransitionOnChange);
      notifyThemeChange();
    },
    [disableTransitionOnChange],
  );

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: () => {},
    };
  }
  return ctx;
}
