import Link from "next/link";
import { GitHubBrandIcon } from "@/components/icons/GitHubBrandIcon";
import { Button } from "@/components/ui/button";
import { landingCtaTitle } from "@/lib/landing-typography";
import { FOOTER_NAV } from "@/lib/nav";

const GITHUB_HREF =
  FOOTER_NAV.find((section) => section.title === "Project")?.links.find(
    (link) => link.label === "GitHub",
  )?.href ?? "https://github.com/XavierAgostino/cfp-selection-simulator";

export function FinalCtaSection() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/80 bg-card/50 px-6 py-12 text-center shadow-[0_16px_48px_-16px_rgba(0,0,0,0.55)] sm:px-12 sm:py-16">
        <h2 className={landingCtaTitle}>Open the room</h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Start with the latest projected field, then inspect the bubble, compare scenarios, and
          read the methodology.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Button nativeButton={false} render={<Link href="/dashboard" />} size="xl" className="w-full sm:w-auto">
            Open Selection Room
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/validation" />}
            size="xl"
            className="w-full sm:w-auto"
          >
            View Validation
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={GITHUB_HREF} target="_blank" rel="noopener noreferrer" />}
            size="xl"
            className="w-full sm:w-auto"
          >
            <GitHubBrandIcon className="size-4.5" />
            GitHub
          </Button>
        </div>
      </div>
    </section>
  );
}
