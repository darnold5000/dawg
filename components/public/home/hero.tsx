import Image from "next/image";
import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden text-primary-foreground">
      <div className="absolute inset-0 bg-ink" />
      <div className="absolute inset-0 athletic-grid opacity-40" />
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 85% 40%, rgb(31 92 255 / 0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 80%, rgb(255 212 0 / 0.12), transparent 50%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="rise-in order-2 lg:order-1">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Plainfield, Indiana
          </p>
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-white/80">
            <MapPin className="h-4 w-4 text-brand" aria-hidden />
            Youth Athletic Training · Strength · Speed · Mindset
          </p>
          <h1 className="font-heading text-5xl leading-[0.95] tracking-wide text-white sm:text-6xl md:text-7xl">
            Build the{" "}
            <span className="text-gold">Athlete.</span>
            <br />
            Develop the{" "}
            <span className="text-brand">Mindset.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Positive, age-appropriate training that pushes young athletes to get
            stronger, faster, and more confident — on the field and in life.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="cta-pulse h-14 bg-gold px-8 text-base font-bold text-gold-foreground hover:bg-gold/90"
            >
              <Link href="/schedule">View Training Schedule</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 border-0 bg-brand px-8 text-base font-bold text-white hover:bg-brand/90"
            >
              <Link href="/#training">Explore Programs</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm font-medium text-white/60">
            Group classes · Private training · Book online — no account needed
          </p>
        </div>

        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <div className="relative w-full max-w-[420px] sm:max-w-[480px]">
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-brand/40 via-transparent to-gold/30 blur-2xl" />
            <Image
              src="/images/dawg/logo.jpg"
              alt={`${SITE.name} logo`}
              width={612}
              height={440}
              priority
              className="relative h-auto w-full rounded-2xl border border-white/10 bg-black object-contain shadow-[0_20px_80px_rgba(31,92,255,0.35)]"
              sizes="(max-width: 1024px) 90vw, 480px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
