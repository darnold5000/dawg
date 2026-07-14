import Image from "next/image";
import type { Trainer } from "@/lib/types/database";

export function HomeTrainers({ trainers }: { trainers: Trainer[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
          Coaches
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          Meet the Trainers
        </h2>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trainers.map((trainer) => (
          <article
            key={trainer.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="relative aspect-square bg-secondary">
              <Image
                src={trainer.photo_url ?? "/images/dawg/trainers/placeholder.svg"}
                alt={`Photo of ${trainer.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="font-heading text-2xl tracking-wide">{trainer.name}</h3>
              {trainer.title ? (
                <p className="mt-1 text-sm font-medium text-brand">{trainer.title}</p>
              ) : null}
              {trainer.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {trainer.bio}
                </p>
              ) : null}
              {trainer.specialties?.length ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {trainer.specialties.join(" · ")}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
