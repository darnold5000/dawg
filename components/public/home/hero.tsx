import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden angled-accent bg-ink text-primary-foreground">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgb(240 162 2 / 0.35), transparent 50%), radial-gradient(ellipse at 80% 80%, rgb(240 162 2 / 0.15), transparent 45%)",
        }}
      />
      <div className="absolute inset-0 athletic-grid opacity-40" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url(/images/dawg/hero/training.svg)" }}
        role="img"
        aria-label="Young athletes training for speed and agility"
      />

      <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-24 sm:px-6 md:min-h-[70vh] md:justify-center md:pb-28 md:pt-28">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand">
          <MapPin className="h-4 w-4" aria-hidden />
          Youth Athletic Training in Mooresville, Indiana
        </p>
        <h1 className="max-w-3xl font-heading text-5xl leading-[0.95] tracking-wide sm:text-6xl md:text-7xl">
          {SITE.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          DAWG Youth Training helps young athletes build strength, speed,
          agility, confidence, and discipline through positive, age-appropriate
          athletic training.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 bg-brand px-8 text-base font-semibold text-brand-foreground hover:bg-brand/90"
          >
            <Link href="/schedule">View Training Schedule</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-white/30 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/#training">Explore Programs</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-white/55">
          Group classes and private training · Book online · No account required
        </p>
      </div>
    </section>
  );
}
