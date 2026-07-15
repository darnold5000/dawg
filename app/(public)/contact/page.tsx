import { HomeLocation } from "@/components/public/home/location";
import { getBusinessSettings } from "@/lib/data";
import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "Contact",
  description: `Contact ${SITE.name} in Plainfield, Indiana for youth athletic training.`,
  path: "/contact",
});

export default async function ContactPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-heading text-4xl tracking-wide md:text-5xl">
          Contact DAWGZ Youth Training
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Reach out by phone, email, or Facebook — or book a session online
          from the schedule.
        </p>
      </div>
      <HomeLocation settings={settings} />
    </div>
  );
}
