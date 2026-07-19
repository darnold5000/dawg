import { ContactForm } from "@/components/public/contact-form";
import { HomeLocation } from "@/components/public/home/location";
import { getBusinessSettings } from "@/lib/data";
import { createMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";

export const metadata = createMetadata({
  title: "Contact",
  description: `Contact ${SITE.name} in Mooresville, Indiana for youth athletic training.`,
  path: "/contact",
});

export default async function ContactPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-heading text-4xl tracking-wide md:text-5xl">
          Contact DAWG
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Send a message, call, or book a session online from the schedule.
        </p>

        <div className="relative mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
          <ContactForm />
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-xl tracking-wide">Reach us directly</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={SITE.phoneHref}
                    className="font-medium underline underline-offset-2"
                  >
                    {settings.phone ?? SITE.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${settings.email ?? SITE.email}`}
                    className="font-medium underline underline-offset-2"
                  >
                    {settings.email ?? SITE.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Facebook</dt>
                <dd>
                  <a
                    href={settings.facebook_url ?? SITE.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    DAWG Youth Training
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <HomeLocation settings={settings} />
    </div>
  );
}
