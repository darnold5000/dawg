import { Dumbbell, Gauge, Move, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Dumbbell,
    title: "Strength",
    description:
      "Build age-appropriate strength that supports sports performance and healthy movement.",
  },
  {
    icon: Gauge,
    title: "Speed",
    description:
      "Develop acceleration, top-end speed, and efficient running mechanics.",
  },
  {
    icon: Move,
    title: "Agility",
    description:
      "Improve change of direction, balance, coordination, and body control.",
  },
  {
    icon: Sparkles,
    title: "Confidence",
    description:
      "Train in a positive environment that builds discipline and belief.",
  },
];

export function HomeIntro() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
          Who we are
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          Develop the Complete Athlete
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          DAWG provides youth athletes with a positive, challenging environment
          where they can improve their physical skills, build confidence, and
          develop the mindset needed to succeed in sports and in life.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-brand">
              <item.icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="font-heading text-lg tracking-wide">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
