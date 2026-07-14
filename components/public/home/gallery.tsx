import Image from "next/image";

const GALLERY = [
  {
    src: "/images/dawg/gallery/speed.svg",
    alt: "Athletes working on speed drills",
  },
  {
    src: "/images/dawg/gallery/agility.svg",
    alt: "Youth athletes practicing agility",
  },
  {
    src: "/images/dawg/gallery/strength.svg",
    alt: "Strength training for young athletes",
  },
  {
    src: "/images/dawg/gallery/group.svg",
    alt: "Group class training session",
  },
  {
    src: "/images/dawg/gallery/private.svg",
    alt: "Private lesson coaching",
  },
  {
    src: "/images/dawg/gallery/facility.svg",
    alt: "DAWG training facility atmosphere",
  },
];

export function HomeGallery() {
  return (
    <section className="bg-secondary/50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
            Gallery
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Training in Action
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Placeholder imagery for development. Replace with approved DAWG
            photos in <code className="text-xs">/public/images/dawg/</code>.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {GALLERY.map((item) => (
            <div
              key={item.src}
              className="relative aspect-square overflow-hidden rounded-xl bg-ink"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
