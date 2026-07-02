"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LucideAppIcon } from "@/components/icons/LucideAppIcon";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderNavLink({
  href,
  label,
  active,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "espn-nav-link group relative inline-flex items-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1b1c]",
        active ? "text-white" : "text-[#9a9a9a] hover:text-[#ececec]",
        className,
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-0 h-[2px] origin-center bg-[#cc0000] transition-transform duration-200 ease-out motion-reduce:transition-none",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}

/** Global nav — dark chrome, Selection Room wordmark, section links. */
export function EspnGlobalHeader() {
  const pathname = usePathname();

  return (
    <header className="espn-global-header sticky top-0 z-50 border-b border-black/40 bg-[#1a1b1c] text-[#9a9a9a] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="mx-auto flex h-11 max-w-none items-stretch gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-stretch gap-1 sm:gap-2">
          <Link
            href="/"
            className="group flex shrink-0 items-center self-center rounded-sm py-1 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
            aria-label="Selection Room home"
          >
            <span className="text-[17px] font-extrabold uppercase leading-none tracking-[-0.04em] text-[#cc0000] transition-opacity duration-200 group-hover:opacity-90 sm:text-[18px]">
              Selection Room
            </span>
          </Link>

          <nav
            aria-label="Selection Room sections"
            className="ml-1 hidden min-w-0 flex-1 items-stretch overflow-x-auto lg:flex"
          >
            {PRIMARY_NAV.map((item) => (
              <HeaderNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>
        </div>

        <ul className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <li>
            <ThemeToggle variant="header" />
          </li>
          <li className="lg:hidden">
            <MobileNav pathname={pathname} />
          </li>
        </ul>
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[#9a9a9a] hover:bg-white/[0.06] hover:text-white"
            aria-label="Open menu"
          />
        }
      >
        <LucideAppIcon icon={Menu} size={18} strokeWidth={2} />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100vw-2rem,18rem)] border-border/60 bg-background">
        <SheetHeader className="border-b border-border/60 pb-4 text-left">
          <SheetTitle className="text-sm font-extrabold uppercase tracking-wide text-[#cc0000]">
            Selection Room
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-0.5 py-4">
          {PRIMARY_NAV.map((item) => (
            <SheetClose
              key={item.href}
              render={
                <HeaderNavLink
                  href={item.href}
                  label={item.label}
                  active={isActive(pathname, item.href)}
                  className="w-full justify-start rounded-md px-3 py-2.5 normal-case tracking-normal"
                />
              }
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
