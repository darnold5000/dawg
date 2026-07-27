import Image from "next/image";
import type { Trainer } from "@/lib/types/database";

type HomeTrainersProps = {
  trainers: Trainer[];
  /** Side-by-side bio + portrait (best for a single head coach on About). */
  variant?: "grid" | "spotlight";
};

export function HomeTrainers({
  trainers,
  variant = "grid",
}: HomeTrainersProps) {
  const spotlight = variant === "spotlight" && trainers.length > 0;
  const trainer = trainers[0];

  if (spotlight && trainer) {
    return (
      <section className="relative overflow-hidden border-y border-brand/20 bg-ink py-16 text-primary-foreground md:py-24">
        <div className="absolute inset-0 athletic-grid opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
              Coaches
            </p>
            <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
              Meet the <span className="text-brand">Trainers</span>
            </h2>
          </div>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0 flex flex-col justify-center lg:pr-2">
              <h3 className="font-heading text-3xl tracking-wide md:text-4xl">
                {trainer.name}
              </h3>
              {trainer.title ? (
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand">
                  {trainer.title}
                </p>
              ) : null}
              {trainer.bio ? (
                <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-white/85 md:text-[1.05rem] md:leading-7">
                  {trainer.bio}
                </p>
              ) : null}
              {trainer.specialties?.length ? (
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                  {trainer.specialties.join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-white/10 bg-black/50 p-2 shadow-2xl sm:max-w-sm lg:max-w-md">
                <Image
                  src={
                    trainer.photo_url ??
                    "/images/dawg/trainers/placeholder.svg"
                  }
                  alt={`Photo of ${trainer.name}`}
                  width={554}
                  height={1024}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 1024px) 85vw, 28vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
          Coaches
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          Meet the <span className="text-brand">Trainers</span>
        </h2>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trainers.map((t) => (
          <article
            key={t.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="relative aspect-square bg-secondary">
              <Image
                src={t.photo_url ?? "/images/dawg/trainers/placeholder.svg"}
                alt={`Photo of ${t.name}`}
                fill
                className="object-contain object-center p-1"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="font-heading text-2xl tracking-wide">{t.name}</h3>
              {t.title ? (
                <p className="mt-1 text-sm font-medium text-brand">{t.title}</p>
              ) : null}
              {t.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t.bio}
                </p>
              ) : null}
              {t.specialties?.length ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {t.specialties.join(" · ")}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
