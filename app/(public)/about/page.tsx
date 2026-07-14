import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeTrainers } from "@/components/public/home/trainers";
import { HomeWhyDawg } from "@/components/public/home/why-dawg";
import { getTrainers } from "@/lib/data";
import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "About",
  description: `Learn about ${SITE.name} — youth athletic training focused on physical skills and mindset in Mooresville, Indiana.`,
  path: "/about",
});

export default async function AboutPage() {
  const trainers = await getTrainers();

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
              About DAWG
            </p>
            <h1 className="font-heading text-4xl tracking-wide md:text-5xl">
              Physical Skills. Strong Mindset.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              DAWG specifically emphasizes developing both physical and mental
              attributes in athletes within a positive and engaging setting.
              Young athletes train for strength, speed, agility, confidence, and
              discipline — with coaching that parents can trust.
            </p>
            <Button
              asChild
              className="mt-6 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link href="/schedule">View Training Schedule</Link>
            </Button>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink">
            <Image
              src="/images/dawg/hero/training.svg"
              alt="Athletes training at DAWG Youth Training"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
      <HomeWhyDawg />
      <HomeTrainers trainers={trainers} />
    </>
  );
}
