"use client";

import { AppIcon } from "@/components/icons/AppIcon";
import { NAV_ICONS } from "@/components/icons/nav-icons";

type PageNavIconProps = {
  href: keyof typeof NAV_ICONS;
};

export function PageNavIcon({ href }: PageNavIconProps) {
  return <AppIcon icon={NAV_ICONS[href]} size={20} strokeWidth={1.75} />;
}
