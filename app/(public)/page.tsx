import { HomeHero } from "@/components/public/home/hero";
import { HomeIntro } from "@/components/public/home/intro";
import { HomePrograms } from "@/components/public/home/programs";
import { HomeUpcomingSessions } from "@/components/public/home/upcoming-sessions";
import { HomeWhyDawg } from "@/components/public/home/why-dawg";
import { HomeTrainers } from "@/components/public/home/trainers";
import { HomeGallery } from "@/components/public/home/gallery";
import { HomeReviews } from "@/components/public/home/reviews";
import { HomeLocation } from "@/components/public/home/location";
import { HomeCta } from "@/components/public/home/cta";
import {
  getBusinessSettings,
  getPrograms,
  getPublishedReviews,
  getTrainers,
  getUpcomingSessions,
} from "@/lib/data";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Youth Athletic Training in Mooresville, Indiana",
  description:
    "DAWGZ Youth Training helps young athletes build strength, speed, agility, confidence, and discipline. Book group classes and private training online.",
  path: "/",
});

export default async function HomePage() {
  const [programs, sessions, trainers, reviews, settings] = await Promise.all([
    getPrograms(),
    getUpcomingSessions(8),
    getTrainers(),
    getPublishedReviews(),
    getBusinessSettings(),
  ]);

  return (
    <>
      {settings.homepage_announcement ? (
        <div className="bg-gold px-4 py-2.5 text-center text-sm font-bold text-gold-foreground">
          {settings.homepage_announcement}
        </div>
      ) : null}
      <HomeHero />
      <HomeIntro />
      <HomePrograms programs={programs} />
      <HomeUpcomingSessions sessions={sessions} />
      <HomeWhyDawg />
      <HomeTrainers trainers={trainers} />
      <HomeGallery />
      <HomeReviews reviews={reviews} />
      <HomeLocation settings={settings} />
      <HomeCta />
    </>
  );
}
