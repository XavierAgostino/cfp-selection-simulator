"use client";

import { AppIcon } from "@/components/icons/AppIcon";
import { NAV_HUGEICONS } from "@/components/icons/nav-icons";

type PageNavIconProps = {
  href: keyof typeof NAV_HUGEICONS;
};

export function PageNavIcon({ href }: PageNavIconProps) {
  return <AppIcon icon={NAV_HUGEICONS[href]} size={20} strokeWidth={1.75} />;
}
