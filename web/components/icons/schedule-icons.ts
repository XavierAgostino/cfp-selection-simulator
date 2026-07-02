import {
  Airplane01Icon,
  Home01Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import type { Location } from "@/lib/types";

export const SCHEDULE_LOCATION_ICONS = {
  home: Home01Icon,
  away: Airplane01Icon,
  neutral: Location01Icon,
} as const satisfies Record<Location, unknown>;
