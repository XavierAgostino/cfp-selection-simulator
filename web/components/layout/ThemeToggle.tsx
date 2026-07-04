"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/color-scheme";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideAppIcon } from "@/components/icons/LucideAppIcon";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "header";
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ variant = "header" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  // True after hydration only — resolvedTheme is unknowable during SSR.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "h-9 w-9 text-[#9a9a9a] transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:ring-white/25",
        variant === "header" && "rounded",
      )}
      aria-label={label}
      disabled={!mounted}
    >
      {isDark ? (
        <LucideAppIcon icon={Sun} size={16} strokeWidth={2} />
      ) : (
        <LucideAppIcon icon={Moon} size={16} strokeWidth={2} />
      )}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
