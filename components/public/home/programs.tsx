import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Program } from "@/lib/types/database";
import { ageRangeLabel } from "@/lib/format";

export function HomePrograms({ programs }: { programs: Program[] }) {
  return (
    <section id="training" className="relative py-16 md:py-24">
      <div className="absolute inset-0 bg-secondary/40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
            Training programs
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Find the{" "}
            <span className="text-brand">Right Fit</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Group classes and private training designed for youth athletes —
            book online anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {programs.map((program) => (
            <article
              key={program.id}
              className="overflow-hidden rounded-xl border border-brand/25 bg-card shadow-[0_0_40px_rgba(31,92,255,0.1)] transition hover:border-gold/40"
            >
              <div className="relative aspect-[16/9] bg-ink">
                <Image
                  src={program.image_url ?? "/images/dawg/programs/big-dawgs.jpg"}
                  alt={`${program.name} training program`}
                  fill
                  className="object-cover object-center opacity-95"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-heading text-2xl tracking-wide text-white">
                  {program.name}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {program.short_description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Ages</dt>
                    <dd className="font-semibold">
                      {ageRangeLabel(program.minimum_age, program.maximum_age)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-semibold">
                      {program.default_duration_minutes
                        ? `${program.default_duration_minutes} min`
                        : "Varies"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Class size</dt>
                    <dd className="font-semibold">
                      {program.default_capacity
                        ? `Up to ${program.default_capacity}`
                        : "Varies"}
                    </dd>
                  </div>
                </dl>
                <Button
                  asChild
                  className="mt-5 w-full bg-gold font-bold text-gold-foreground hover:bg-gold/90 sm:w-auto"
                >
                  <Link href="/schedule">View Schedule</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
