"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";
import { LucideAppIcon } from "@/components/icons/LucideAppIcon";
import {
  DOCS_NAV_ICON,
  NAV_HUGEICONS,
} from "@/components/icons/nav-icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FOOTER_PRODUCT_NAME,
  FOOTER_TAGLINE,
  MOBILE_NAV_GROUPS,
  PRIMARY_NAV,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/docs") {
    return pathname === "/docs" || pathname.startsWith("/docs/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-white/5 text-foreground"
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function NavItemIcon({ href }: { href: string }) {
  const icon =
    href in NAV_HUGEICONS
      ? NAV_HUGEICONS[href as keyof typeof NAV_HUGEICONS]
      : DOCS_NAV_ICON;

  return <AppIcon icon={icon} size={18} strokeWidth={1.75} className="opacity-80" />;
}

function MobileNavRow({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <SheetClose
        nativeButton={false}
        render={
          <Link
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md py-2.5 pr-2 pl-3 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-white/5 text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <NavItemIcon href={href} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <LucideAppIcon
              icon={ChevronRight}
              size={16}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/50"
            />
          </Link>
        }
      />
    </li>
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
            className="h-9 w-9 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Open menu"
          />
        }
      >
        <LucideAppIcon icon={Menu} size={18} strokeWidth={2} />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[min(90vw,420px)] max-w-[420px] flex-col gap-0 border-border bg-background p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="space-y-0 border-b border-border px-4 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <Image
              src="/brand/selection-room-mark-128.png"
              alt=""
              width={32}
              height={32}
              className="mt-0.5 h-8 w-8 shrink-0 rounded-sm"
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-normal text-foreground">
                {FOOTER_PRODUCT_NAME}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs leading-snug">
                {FOOTER_TAGLINE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Mobile navigation" className="px-2 py-3">
            {MOBILE_NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.title}>
                {groupIndex > 0 ? <Separator className="my-3" /> : null}
                <p className="px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.links.map((item) => (
                    <MobileNavRow
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(pathname, item.href)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/** Global nav — compact header, grouped mobile drawer. */
export function EspnGlobalHeader() {
  const pathname = usePathname();

  return (
    <header className="app-global-header sticky top-0 z-50 border-b border-border bg-background/95 text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-11 max-w-none items-center gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Selection Room home"
          >
            <Image
              src="/brand/selection-room-icon-128.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 transition-opacity duration-200 group-hover:opacity-90"
              priority
            />
            <span className="hidden text-sm font-semibold text-foreground sm:inline">
              {FOOTER_PRODUCT_NAME}
            </span>
          </Link>

          <nav
            aria-label="Selection Room sections"
            className="ml-1 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex"
          >
            {PRIMARY_NAV.map((item) => (
              <DesktopNavLink
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
