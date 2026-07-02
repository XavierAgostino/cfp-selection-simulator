"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { LucideAppIcon } from "@/components/icons/LucideAppIcon";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  href?: string;
};

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") {
    return [{ label: "Dashboard" }];
  }

  if (pathname.startsWith("/teams/")) {
    const team = decodeURIComponent(pathname.slice("/teams/".length).split("/")[0] ?? "");
    return [
      { label: "Rankings", href: "/rankings" },
      { label: team || "Team" },
    ];
  }

  const navItem = PRIMARY_NAV.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );

  if (navItem) {
    return [{ label: "Dashboard", href: "/" }, { label: navItem.label }];
  }

  return [{ label: "Dashboard", href: "/" }];
}

export function PageBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-[11px] leading-none">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <LucideAppIcon
                  icon={ChevronRight}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground/50"
                />
              ) : null}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast ? "font-medium text-foreground/90" : "text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
