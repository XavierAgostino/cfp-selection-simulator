"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { AppIcon } from "@/components/icons/AppIcon";
import { Button } from "@/components/ui/button";
import {
  PUBLIC_DEMO_BANNER_BADGE,
  PUBLIC_DEMO_BANNER_CTA,
  PUBLIC_DEMO_BANNER_DISMISS_KEY,
  PUBLIC_DEMO_BANNER_HREF,
  PUBLIC_DEMO_BANNER_MESSAGE,
  PUBLIC_DEMO_BANNER_MESSAGE_SHORT,
} from "@/lib/demoMode";

const bannerListeners = new Set<() => void>();

function subscribeToBanner(onStoreChange: () => void) {
  bannerListeners.add(onStoreChange);
  return () => {
    bannerListeners.delete(onStoreChange);
  };
}

function notifyBannerChange() {
  bannerListeners.forEach((listener) => listener());
}

function readBannerVisible(): boolean {
  try {
    return localStorage.getItem(PUBLIC_DEMO_BANNER_DISMISS_KEY) !== "1";
  } catch {
    return true;
  }
}

export function DemoModeBannerClient() {
  const visible = useSyncExternalStore(
    subscribeToBanner,
    readBannerVisible,
    () => false,
  );

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(PUBLIC_DEMO_BANNER_DISMISS_KEY, "1");
    } catch {
      // Storage may be unavailable in private mode.
    }
    notifyBannerChange();
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="relative border-b border-border bg-background before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent-gold/80 before:to-transparent"
    >
      <div className="mx-auto flex h-10 max-w-none items-center justify-center gap-2 px-11 sm:gap-3 sm:px-14">
        <span className="inline-flex shrink-0 items-center rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-gold">
          {PUBLIC_DEMO_BANNER_BADGE}
        </span>
        <span
          className="hidden h-3.5 w-px shrink-0 bg-border sm:block"
          aria-hidden
        />
        <p className="min-w-0 truncate text-center text-xs text-muted-foreground sm:text-sm">
          <span className="sm:hidden">{PUBLIC_DEMO_BANNER_MESSAGE_SHORT}</span>
          <span className="hidden sm:inline">{PUBLIC_DEMO_BANNER_MESSAGE}</span>
        </p>
        <Link
          href={PUBLIC_DEMO_BANNER_HREF}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground transition-colors hover:text-accent-gold sm:text-sm"
        >
          {PUBLIC_DEMO_BANNER_CTA}
          <AppIcon icon={ArrowRight} size={14} strokeWidth={2} />
        </Link>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        className="absolute top-1/2 right-2 size-7 -translate-y-1/2 text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground sm:right-3"
        aria-label="Dismiss demo notice"
      >
        <AppIcon icon={X} size={14} strokeWidth={2} />
      </Button>
    </div>
  );
}
