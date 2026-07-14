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
      "Focus on movement quality, balance, speed, strength, agility, coordination, and body control.",
  },
  {
    icon: Trophy,
    title: "Confidence and Discipline",
    description:
      "Develop mental habits athletes can carry into practices, games, school, and everyday life.",
  },
];

export function HomeWhyDawg() {
  return (
    <section className="border-y border-border bg-ink py-16 text-primary-foreground md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
            Why DAWG
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Train with Purpose
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {REASONS.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <item.icon className="mb-3 h-6 w-6 text-brand" aria-hidden />
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
