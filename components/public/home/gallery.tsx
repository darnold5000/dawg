const PLACEHOLDERS = [
  "Speed & agility drills",
  "Strength training",
  "Group class energy",
  "Private coaching",
  "Facility turf work",
  "Athletes in action",
];

export function HomeGallery() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl pt-2">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
            The Dawg House
          </p>
          <h2 className="font-heading text-4xl leading-none tracking-wide text-white md:text-5xl">
            Train Like You Mean It
          </h2>
          <p className="mt-4 text-muted-foreground">
            Photo gallery coming soon — approved DAWG training shots will live
            here.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {PLACEHOLDERS.map((label, i) => (
            <div
              key={label}
              className={`flex items-center justify-center rounded-xl border border-dashed border-brand/35 bg-ink/60 athletic-grid ${
                i === 0
                  ? "aspect-square md:col-span-2 md:aspect-[16/10]"
                  : "aspect-square"
              }`}
            >
              <div className="px-4 text-center">
                <p className="font-heading text-sm tracking-wide text-brand md:text-base">
                  Photo {i + 1}
                </p>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
