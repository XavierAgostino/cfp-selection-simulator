/**
 * FBS conference metadata for broadcast-style league badges.
 * Logo URLs use ESPN's ncaa_conf CDN (cfbplotR / CFBD naming).
 */

export interface ConferenceMeta {
  /** Wire-format name from the API */
  key: string;
  displayName: string;
  shortLabel: string;
  logoUrl: string | null;
}

const ESPN_CONF_LOGO = (id: number) =>
  `https://a.espncdn.com/i/teamlogos/ncaa_conf/500/${id}.png`;

/** Canonical registry keyed by API conference string. */
const CONFERENCE_REGISTRY: Record<string, ConferenceMeta> = {
  SEC: {
    key: "SEC",
    displayName: "SEC",
    shortLabel: "SEC",
    logoUrl: ESPN_CONF_LOGO(8),
  },
  "Big Ten": {
    key: "Big Ten",
    displayName: "Big Ten",
    shortLabel: "B1G",
    logoUrl: ESPN_CONF_LOGO(5),
  },
  "Big 12": {
    key: "Big 12",
    displayName: "Big 12",
    shortLabel: "Big 12",
    logoUrl: ESPN_CONF_LOGO(4),
  },
  ACC: {
    key: "ACC",
    displayName: "ACC",
    shortLabel: "ACC",
    logoUrl: ESPN_CONF_LOGO(1),
  },
  "Pac-12": {
    key: "Pac-12",
    displayName: "Pac-12",
    shortLabel: "Pac-12",
    logoUrl: ESPN_CONF_LOGO(9),
  },
  "American Athletic": {
    key: "American Athletic",
    displayName: "American Athletic",
    shortLabel: "AAC",
    logoUrl: ESPN_CONF_LOGO(151),
  },
  "Mountain West": {
    key: "Mountain West",
    displayName: "Mountain West",
    shortLabel: "MWC",
    logoUrl: ESPN_CONF_LOGO(17),
  },
  "Sun Belt": {
    key: "Sun Belt",
    displayName: "Sun Belt",
    shortLabel: "Sun Belt",
    logoUrl: ESPN_CONF_LOGO(37),
  },
  "Mid-American": {
    key: "Mid-American",
    displayName: "Mid-American",
    shortLabel: "MAC",
    logoUrl: ESPN_CONF_LOGO(15),
  },
  "Conference USA": {
    key: "Conference USA",
    displayName: "Conference USA",
    shortLabel: "CUSA",
    logoUrl: ESPN_CONF_LOGO(12),
  },
  "FBS Independents": {
    key: "FBS Independents",
    displayName: "FBS Independents",
    shortLabel: "IND",
    logoUrl: ESPN_CONF_LOGO(18),
  },
  Independent: {
    key: "Independent",
    displayName: "Independent",
    shortLabel: "IND",
    logoUrl: ESPN_CONF_LOGO(18),
  },
};

const ALIASES: Record<string, keyof typeof CONFERENCE_REGISTRY> = {
  "American": "American Athletic",
  AAC: "American Athletic",
  "The American": "American Athletic",
  MAC: "Mid-American",
  CUSA: "Conference USA",
  "C-USA": "Conference USA",
  MWC: "Mountain West",
  IND: "FBS Independents",
};

const FALLBACK: ConferenceMeta = {
  key: "unknown",
  displayName: "Unknown",
  shortLabel: "—",
  logoUrl: null,
};

function normalizeConferenceKey(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (trimmed in CONFERENCE_REGISTRY) return trimmed;
  const alias = ALIASES[trimmed];
  if (alias) return alias;
  return trimmed;
}

/** Resolve conference metadata; unknown leagues fall back to initials from the wire name. */
export function getConferenceMeta(conference: string): ConferenceMeta {
  const key = normalizeConferenceKey(conference);
  const known = CONFERENCE_REGISTRY[key];
  if (known) return known;

  if (!conference.trim()) return FALLBACK;

  const words = conference.trim().split(/\s+/);
  const shortLabel =
    words.length === 1
      ? words[0]!.slice(0, 4).toUpperCase()
      : words
          .map((w) => w[0])
          .join("")
          .slice(0, 4)
          .toUpperCase();

  return {
    key: conference,
    displayName: conference,
    shortLabel,
    logoUrl: null,
  };
}

export const CFP_CONFERENCE_NAMES = Object.keys(CONFERENCE_REGISTRY);
