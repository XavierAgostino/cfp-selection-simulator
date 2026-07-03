import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";

export default function DocsRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DocsLayout
        tree={source.pageTree}
        nav={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        searchToggle={{ enabled: true }}
        sidebar={{ collapsible: false }}
        containerProps={{
          className: "docs-layout",
          style: {
            ["--fd-docs-height" as string]: "calc(100dvh - 2.75rem)",
            ["--fd-layout-width" as string]: "90rem",
            ["--fd-sidebar-width" as string]: "280px",
          },
        }}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
