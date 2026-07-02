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
