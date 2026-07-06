"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sticky section switcher for small screens: a horizontally scrollable pill
 * row pinned under the global header, so moving between Dashboard, Rankings,
 * Bubble, etc. never requires opening the hamburger drawer. Hidden at `lg`,
 * where the header shows the full desktop nav.
 */
export function MobileSectionNav() {
  const pathname = usePathname();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Keep the active pill visible when landing deep in the row (e.g. /validation).
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (
      activeRect.left < containerRect.left ||
      activeRect.right > containerRect.right
    ) {
      container.scrollLeft +=
        activeRect.left -
        containerRect.left -
        (containerRect.width - activeRect.width) / 2;
    }
  }, [pathname]);

  return (
    <nav
      aria-label="Selection Room sections"
      className="sticky top-12 z-40 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
