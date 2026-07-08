import Link from "next/link";
import { Button } from "@/components/ui/button";
import { landingCtaTitle } from "@/lib/landing-typography";

export function FinalCtaSection() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
      <div className="reveal-on-scroll mx-auto max-w-3xl rounded-2xl border border-border/80 bg-card/50 px-6 py-12 text-center shadow-panel sm:px-12 sm:py-16">
        <h2 className={landingCtaTitle}>Explore the 2025 field.</h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Test your own selection assumptions. See where the model and committee disagree.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/dashboard" />}
            size="xl"
            className="w-full sm:w-auto"
          >
            Open Selection Room
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/validation" />}
            size="xl"
            className="w-full sm:w-auto"
          >
            View validation
          </Button>
        </div>
      </div>
    </section>
  );
}
