import Image from "next/image";
import Link from "next/link";
import { GitHubBrandIcon } from "@/components/icons/GitHubBrandIcon";
import {
  FOOTER_DISCLAIMER,
  FOOTER_NAV,
  FOOTER_PRODUCT_NAME,
  FOOTER_TAGLINE,
  type FooterNavLink,
} from "@/lib/nav";

function FooterLinkIcon({ icon }: { icon: NonNullable<FooterNavLink["icon"]> }) {
  if (icon === "github") {
    return (
      <GitHubBrandIcon className="size-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
    );
  }
  return null;
}

function FooterLink({
  href,
  label,
  external,
  icon,
}: FooterNavLink) {
  const className =
    "group inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground";

  const content = (
    <>
      {icon ? <FooterLinkIcon icon={icon} /> : null}
      <span>{label}</span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function GlobalFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src="/brand/selection-room-mark-128.png"
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 opacity-90 transition-opacity group-hover:opacity-100"
            />
            <div>
              <p className="text-base font-semibold text-foreground">
                {FOOTER_PRODUCT_NAME}
              </p>
              <p className="text-sm text-foreground/65">{FOOTER_TAGLINE}</p>
            </div>
          </Link>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {FOOTER_NAV.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
                {section.title}
              </h2>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-3xl text-sm leading-relaxed text-foreground/55">
          {FOOTER_DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}
