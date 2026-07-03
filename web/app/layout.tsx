import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TeamAssetsProvider } from "@/components/team/TeamAssetsProvider";
import { TeamDrawerProvider } from "@/components/team/TeamDrawerProvider";
import { FirstRunGate } from "@/components/setup/FirstRunGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Selection Room — CFP Selection Simulator",
  description:
    "A premium College Football Playoff selection simulator: live field projections, rankings, bubble watch, and bracket reveal.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Selection Room — CFP Selection, Explained",
    description:
      "Projected fields. Bubble logic. Bracket clarity. A transparent CFP selection simulator.",
    images: [
      {
        url: "/brand/selection-room-og-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Selection Room — CFP Selection, Explained",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Selection Room — CFP Selection, Explained",
    description:
      "Projected fields. Bubble logic. Bracket clarity. A transparent CFP selection simulator.",
    images: ["/brand/selection-room-og-1200x630.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          <TooltipProvider delay={300}>
            <AppLayout>
              <TeamAssetsProvider>
                <TeamDrawerProvider>
                  <AppShell>
                    <FirstRunGate>{children}</FirstRunGate>
                  </AppShell>
                </TeamDrawerProvider>
              </TeamAssetsProvider>
            </AppLayout>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
