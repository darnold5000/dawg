import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Program } from "@/lib/types/database";
import { ageRangeLabel, formatPrice } from "@/lib/format";

export function HomePrograms({ programs }: { programs: Program[] }) {
  return (
    <section id="training" className="bg-secondary/60 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
            Training programs
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Find the Right Fit
          </h2>
          <p className="mt-4 text-muted-foreground">
            Group classes and private training designed for youth athletes —
            editable from the admin dashboard.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {programs.map((program) => (
            <article
              key={program.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="relative aspect-[16/9] bg-ink">
                <Image
                  src={program.image_url ?? "/images/dawg/programs/placeholder.svg"}
                  alt={`${program.name} training program`}
                  fill
                  className="object-cover opacity-90"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="p-6">
                <h3 className="font-heading text-2xl tracking-wide">
                  {program.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {program.short_description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Ages</dt>
                    <dd className="font-medium">
                      {ageRangeLabel(program.minimum_age, program.maximum_age)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium">
                      {program.default_duration_minutes
                        ? `${program.default_duration_minutes} min`
                        : "Varies"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Class size</dt>
                    <dd className="font-medium">
                      {program.default_capacity
                        ? `Up to ${program.default_capacity}`
                        : "Varies"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">From</dt>
                    <dd className="font-medium">
                      {program.default_price != null
                        ? formatPrice(program.default_price)
                        : "See schedule"}
                    </dd>
                  </div>
                </dl>
                <Button
                  asChild
                  className="mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
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
