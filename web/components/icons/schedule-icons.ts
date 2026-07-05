import { House, MapPin, Plane, type LucideIcon } from "lucide-react";
import type { Location } from "@/lib/types";

export const SCHEDULE_LOCATION_ICONS = {
  home: House,
  away: Plane,
  neutral: MapPin,
} as const satisfies Record<Location, LucideIcon>;
