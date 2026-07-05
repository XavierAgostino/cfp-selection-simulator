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
import { AppIcon } from "@/components/icons/AppIcon";
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
        "h-9 w-9 text-muted-foreground transition-all duration-200 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-ring/50",
        variant === "header" && "rounded",
      )}
      aria-label={label}
      disabled={!mounted}
    >
      {isDark ? (
        <AppIcon icon={Sun} size={16} strokeWidth={2} />
      ) : (
        <AppIcon icon={Moon} size={16} strokeWidth={2} />
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
