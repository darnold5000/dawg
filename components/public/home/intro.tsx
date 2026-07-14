import { Dumbbell, Gauge, Move, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Dumbbell,
    title: "Strength",
    description:
      "Age-appropriate power that transfers to practices, games, and everyday confidence.",
  },
  {
    icon: Gauge,
    title: "Speed",
    description:
      "Acceleration, mechanics, and top-end speed — built with intent, not fluff.",
  },
  {
    icon: Move,
    title: "Agility",
    description:
      "Change of direction, balance, and body control that wins in competition.",
  },
  {
    icon: Sparkles,
    title: "Confidence",
    description:
      "A positive, high-energy room where athletes learn to push and believe.",
  },
];

export function HomeIntro() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="max-w-2xl">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
          Who we are
        </p>
        <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
          Develop the{" "}
          <span className="text-brand">Complete</span> Athlete
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          DAWG gives youth athletes a positive, challenging environment to
          sharpen physical skills, build confidence, and develop the mindset to
          succeed in sports and in life.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.title}
            className="group rounded-xl border border-brand/20 bg-card/80 p-5 transition hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_0_30px_rgba(255,212,0,0.15)]"
          >
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-white transition group-hover:bg-gold group-hover:text-gold-foreground">
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
