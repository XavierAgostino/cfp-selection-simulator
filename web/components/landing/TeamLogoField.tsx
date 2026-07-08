import teamAssets from "@/lib/fixtures/team-assets.json";
import type { TeamAssetsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Atmospheric "wall of teams" — real FBS logos (the same ESPN marks used across
 * the app) rendered as faint single-tone silhouettes behind a section, so the
 * flatter editorial blocks feel grounded in the actual sport instead of floating
 * on an empty background. Theme-aware: dark marks in light mode, white marks in
 * dark mode (brightness-0 + dark:invert), so they stay visible either way.
 * Purely decorative: aria-hidden, non-interactive, and masked so it never
 * competes with the copy on top. No new dependencies; logos come from the
 * existing team-assets fixture.
 */

const ASSETS = teamAssets as unknown as TeamAssetsPayload;

// Recognizable, broadly national spread so the wall reads as "college football"
// rather than a random assortment. Order is the visual reading order.
const WALL_TEAMS = [
  "Alabama", "Ohio State", "Georgia", "Michigan", "Texas", "Oregon", "Notre Dame",
  "Penn State", "USC", "Oklahoma", "LSU", "Tennessee", "Clemson", "Florida State",
  "Washington", "Ole Miss", "Miami", "Texas A&M", "Utah", "Wisconsin", "Auburn",
  "Florida", "Nebraska", "Michigan State", "Iowa", "UCLA", "Missouri", "Kansas State",
  "TCU", "Baylor", "Louisville", "NC State", "Arizona", "Colorado", "Kentucky",
  "Oklahoma State", "Texas Tech", "Indiana", "SMU", "Boise State", "Arkansas",
  "Mississippi State", "Virginia Tech", "Pittsburgh", "Minnesota", "Illinois",
  "Duke", "Kansas", "Maryland", "Purdue", "Cincinnati", "West Virginia",
];

function logoFor(team: string): string | null {
  const asset = ASSETS[team];
  if (!asset?.logo) return null;
  return asset.logo.replace(/^http:\/\//, "https://");
}

/**
 * `section` centers the wall and fades it toward the edges (for standalone
 * blocks). `hero` packs the logos at the top and fades them downward so they sit
 * behind the headline and dissolve before the product mockup, letting the wall
 * read as continuous from the hero into the section that follows.
 */
type Variant = "section" | "hero";

const MASK: Record<Variant, string> = {
  section:
    "[mask-image:radial-gradient(130%_120%_at_50%_45%,transparent_8%,#000_38%,#000_62%,transparent_100%)]",
  hero: "[mask-image:linear-gradient(to_bottom,#000_0%,#000_20%,transparent_62%)]",
};

const CONTENT: Record<Variant, string> = {
  section: "items-center content-center",
  hero: "items-start content-start",
};

export function TeamLogoField({
  className,
  variant = "section",
}: {
  className?: string;
  variant?: Variant;
}) {
  const logos = WALL_TEAMS.map((team) => ({ team, logo: logoFor(team) })).filter(
    (entry): entry is { team: string; logo: string } => entry.logo !== null,
  );

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden select-none",
        MASK[variant],
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full flex-wrap justify-center gap-x-10 gap-y-8 px-6 py-10 sm:gap-x-14 sm:gap-y-12",
          CONTENT[variant],
        )}
      >
        {logos.map(({ team, logo }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={team}
            src={logo}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-10 w-10 object-contain opacity-[0.06] brightness-0 dark:opacity-[0.05] dark:invert sm:h-12 sm:w-12"
          />
        ))}
      </div>
    </div>
  );
}
