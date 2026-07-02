import type { TeamAsset, TeamAssetsPayload } from "@/lib/types";

/** ESPN numeric ids for common FBS schools — offline logo fallback when cache misses. */
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
  Syracuse: 183,
  Virginia: 258,
  "Boston College": 103,
  "Wake Forest": 154,
  "NC State": 152,
  "Mississippi State": 344,
  "San Diego State": 21,
  "App State": 2026,
  "Appalachian State": 2026,
};

const NAME_ALIASES: Record<string, string> = {
  Pitt: "Pittsburgh",
  "Southern Miss": "Southern Mississippi",
  "App State": "Appalachian State",
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
