"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GALLERY_IMAGES } from "@/lib/gallery";

export function HomeGallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex != null ? GALLERY_IMAGES[activeIndex] : null;

  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl pt-2">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
            The Dawgz House
          </p>
          <h2 className="font-heading text-4xl leading-none tracking-wide text-white md:text-5xl">
            Train Like You Mean It
          </h2>
          <p className="mt-4 text-muted-foreground">
            Speed, strength, and focused coaching — a look inside DAWGZ Youth
            Training.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {GALLERY_IMAGES.map((image, i) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`group relative overflow-hidden rounded-xl border border-brand/25 bg-ink/60 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                i === 0
                  ? "aspect-square md:col-span-2 md:aspect-[16/10]"
                  : "aspect-square"
              }`}
              aria-label={`View ${image.label}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={
                  i === 0
                    ? "(max-width: 768px) 100vw, 66vw"
                    : "(max-width: 768px) 50vw, 33vw"
                }
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
                <span className="font-heading text-sm tracking-wide text-white md:text-base">
                  {image.label}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={activeIndex != null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null);
        }}
      >
        <DialogContent className="max-w-3xl border-border bg-card p-0 overflow-hidden sm:max-w-3xl">
          {active ? (
            <>
              <div className="relative aspect-[16/10] w-full bg-ink">
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain"
                  priority
                />
              </div>
              <DialogHeader className="px-5 py-4 text-left">
                <DialogTitle className="font-heading tracking-wide">
                  {active.label}
                </DialogTitle>
                <DialogDescription>{active.alt}</DialogDescription>
              </DialogHeader>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
