import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
      <div className="overflow-hidden rounded-2xl bg-ink px-6 py-12 text-center text-primary-foreground sm:px-12">
        <h2 className="font-heading text-3xl tracking-wide md:text-4xl">
          Ready to Book Training?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          Browse the live schedule and reserve a spot for your athlete — no
          Facebook messages required.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 h-12 bg-brand px-8 text-brand-foreground hover:bg-brand/90"
        >
          <Link href="/schedule">View Training Schedule</Link>
        </Button>
      </div>
    </section>
  );
}
