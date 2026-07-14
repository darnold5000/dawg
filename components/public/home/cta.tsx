import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
      <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand via-[#1639b8] to-ink px-6 py-14 text-center text-white sm:px-12">
        <div className="absolute inset-0 athletic-grid opacity-30" />
        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">
            Ready when you are
          </p>
          <h2 className="mt-3 font-heading text-3xl tracking-wide md:text-5xl">
            Get Your Athlete in the Room
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Browse the live schedule and lock in a session — no Facebook
            messages required.
          </p>
          <Button
            asChild
            size="lg"
            className="cta-pulse mt-8 h-12 bg-gold px-8 font-bold text-gold-foreground hover:bg-gold/90"
          >
            <Link href="/schedule">View Training Schedule</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
