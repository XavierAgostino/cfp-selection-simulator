import Link from "next/link";

export type NextStepLink = {
  href: string;
  label: string;
  external?: boolean;
};

export function NextSteps({ links }: { links: NextStepLink[] }) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Next steps"
      className="not-prose mt-10 rounded-lg border border-border bg-card p-6"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        Next steps
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                className="text-sm text-accent-gold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-accent-gold hover:underline"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
