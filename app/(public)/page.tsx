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

const homepageTitle = "DAWG Youth Training";
const homepageDescription =
  "Youth athletic training, programs, and development built to help athletes improve their skills and confidence.";
const homepageUrl = "https://dawg-ashen.vercel.app";

export const metadata = createMetadata({
  title: homepageTitle,
  description: homepageDescription,
  path: "/",
  image: "/images/dawg/og-social.jpg",
  exactTitle: true,
  siteName: homepageTitle,
  baseUrl: homepageUrl,
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
      <HomeTrainers trainers={trainers} variant="spotlight" />
      <div className="hidden" aria-hidden>
        <HomeGallery />
      </div>
      <HomeReviews reviews={reviews} />
      <HomeLocation settings={settings} />
      <HomeCta />
    </>
  );
}
