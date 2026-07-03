import type { TeamAsset, TeamAssetsPayload } from "@/lib/types";

/**
 * ESPN numeric ids for FBS schools — offline logo fallback when the per-run
 * team-assets.json cache misses (e.g. the Validation view references historical
 * teams outside the active run's ~12-team payload).
 *
 * Source of truth is `src/assets/teams.py::ESPN_TEAM_IDS`; keep this mirror in
 * sync so any team the engine can reference resolves to a real logo here.
 */
export const ESPN_TEAM_IDS: Record<string, number> = {
  Georgia: 61,
  "Ohio State": 194,
  "Notre Dame": 87,
  Alabama: 333,
  Michigan: 130,
  Texas: 251,
  Oregon: 2483,
  "Penn State": 213,
  Clemson: 228,
  LSU: 99,
  Oklahoma: 201,
  "Florida State": 52,
  USC: 30,
  Washington: 264,
  Tennessee: 2633,
  "Texas A&M": 245,
  Auburn: 2,
  Florida: 57,
  "Ole Miss": 145,
  Missouri: 142,
  Miami: 2390,
  "Boise State": 68,
  Iowa: 2294,
  Wisconsin: 275,
  Utah: 254,
  TCU: 2628,
  Baylor: 239,
  "Kansas State": 2306,
  Colorado: 38,
  "Arizona State": 9,
  Indiana: 84,
  BYU: 252,
  Liberty: 2335,
  Army: 349,
  Navy: 2426,
  SMU: 2567,
  Louisville: 97,
  "North Carolina": 153,
  "Virginia Tech": 259,
  Pitt: 221,
  Pittsburgh: 221,
  "West Virginia": 277,
  UCF: 2116,
  "Texas Tech": 2641,
  "Oklahoma State": 197,
  Arkansas: 8,
  Kentucky: 96,
  "South Carolina": 2579,
  Vanderbilt: 238,
  Nebraska: 158,
  Minnesota: 135,
  Illinois: 356,
  "Michigan State": 127,
  UCLA: 26,
  "Iowa State": 66,
  Cincinnati: 2132,
  Memphis: 235,
  Tulane: 2655,
  UNLV: 2439,
  "Washington State": 265,
  "Oregon State": 204,
  "Georgia Tech": 59,
  Duke: 150,
  Northwestern: 77,
  Purdue: 2509,
  Rutgers: 164,
  Maryland: 120,
  California: 25,
  Stanford: 24,
  Arizona: 12,
  Kansas: 2305,
  Houston: 248,
  "James Madison": 256,
  UConn: 41,
  Connecticut: 41,
  "South Florida": 58,
  Toledo: 2649,
  "Northern Illinois": 2459,
  "North Texas": 249,
  "San Diego State": 21,
  "Fresno State": 278,
  "App State": 2026,
  "Appalachian State": 2026,
  "Coastal Carolina": 324,
  Marshall: 276,
  Louisiana: 309,
  Troy: 2653,
  "Western Kentucky": 98,
  "East Carolina": 151,
  "South Alabama": 2654,
  "Georgia Southern": 290,
  "Old Dominion": 295,
  Buffalo: 2084,
  "Bowling Green": 189,
  Ohio: 195,
  "Miami (OH)": 193,
  "Ball State": 2050,
  Akron: 2006,
  "Central Michigan": 2117,
  "Eastern Michigan": 2199,
  "Western Michigan": 2711,
  "Air Force": 2005,
  "Colorado State": 36,
  Wyoming: 2751,
  Hawaii: 62,
  Nevada: 2440,
  "San Jose State": 23,
  "New Mexico": 167,
  "Utah State": 328,
  "Florida Atlantic": 2226,
  FIU: 2229,
  "Florida International": 2229,
  Charlotte: 2429,
  UTSA: 2636,
  Rice: 242,
  "North Carolina State": 152,
  "NC State": 152,
  Virginia: 258,
  "Boston College": 103,
  Syracuse: 183,
  "Wake Forest": 154,
  "Mississippi State": 344,
  "Missouri State": 2623,
  "Kennesaw State": 338,
};

// Mirrors src/assets/teams.py::TEAM_NAME_ALIASES (plus a few display-only forms).
const NAME_ALIASES: Record<string, string> = {
  "Connecticut Huskies": "Connecticut",
  "James Madison Dukes": "James Madison",
  "App State": "Appalachian State",
  FIU: "Florida International",
  "Miami (FL)": "Miami",
  Pitt: "Pittsburgh",
  "Southern Miss": "Southern Mississippi",
  USF: "South Florida",
  UMass: "Massachusetts",
};

export interface ResolvedTeamVisual {
  logoUrl: string | null;
  abbreviation: string | null;
  primaryColor: string | null;
}

function espnLogoUrl(espnId: string | number): string {
  return `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`;
}

function normalizeTeamName(team: string): string {
  return NAME_ALIASES[team] ?? team;
}

function lookupAsset(
  team: string,
  assets: TeamAssetsPayload | null | undefined,
): TeamAsset | null {
  if (!assets) return null;
  if (assets[team]) return assets[team];
  const normalized = normalizeTeamName(team);
  if (assets[normalized]) return assets[normalized];
  return null;
}

/** Merge API payload fields with team-assets.json and ESPN id fallbacks. */
export function resolveTeamVisual(
  team: string,
  overrides: {
    logoUrl?: string | null;
    abbreviation?: string | null;
    primaryColor?: string | null;
  } = {},
  assets: TeamAssetsPayload | null | undefined = null,
): ResolvedTeamVisual {
  const normalized = normalizeTeamName(team);
  const asset = lookupAsset(team, assets);

  let logoUrl = overrides.logoUrl ?? asset?.logo ?? null;
  const abbreviation = overrides.abbreviation ?? asset?.abbreviation ?? null;
  const primaryColor = overrides.primaryColor ?? asset?.primary_color ?? null;

  if (!logoUrl) {
    const espnId = asset?.espn_id ?? ESPN_TEAM_IDS[normalized] ?? ESPN_TEAM_IDS[team];
    if (espnId != null) {
      logoUrl = espnLogoUrl(espnId);
    }
  }

  return { logoUrl, abbreviation, primaryColor };
}
