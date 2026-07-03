import { AppShell } from "@/components/layout/AppShell";
import { FirstRunGate } from "@/components/setup/FirstRunGate";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <FirstRunGate>{children}</FirstRunGate>
    </AppShell>
  );
}
