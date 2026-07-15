import { HeartHandshake, Layers, Target, Trophy } from "lucide-react";

const REASONS = [
  {
    icon: Target,
    title: "Age-Appropriate Development",
    description:
      "Training matches the athlete’s age, experience, physical development, and current abilities.",
  },
  {
    icon: HeartHandshake,
    title: "Positive Coaching",
    description:
      "Athletes are challenged while receiving encouragement and clear instruction.",
  },
  {
    icon: Layers,
    title: "Athletic Fundamentals",
    description:
      "Movement quality, balance, speed, strength, agility, coordination, and body control.",
  },
  {
    icon: Trophy,
    title: "Confidence and Discipline",
    description:
      "Mental habits athletes carry into practices, games, school, and everyday life.",
  },
];

export function HomeWhyDawg() {
  return (
    <section className="relative overflow-hidden border-y border-brand/20 bg-ink py-16 text-primary-foreground md:py-24">
      <div className="absolute inset-0 athletic-grid opacity-40" />
      <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
            Why DAWGZ
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Train with{" "}
            <span className="text-brand">Purpose</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {REASONS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-gold/40"
            >
              <item.icon className="mb-3 h-6 w-6 text-gold" aria-hidden />
              <h3 className="font-heading text-xl tracking-wide">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
