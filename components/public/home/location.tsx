import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessSettings } from "@/lib/types/database";
import { SITE } from "@/lib/constants";

export function HomeLocation({ settings }: { settings: BusinessSettings }) {
  const phone = settings.phone ?? SITE.phone;
  const email = settings.email ?? SITE.email;
  const address = [
    settings.address_line_1,
    settings.address_line_2,
    [settings.city, settings.state, settings.postal_code].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
  const mapUrl = settings.map_embed_url ?? SITE.mapEmbedUrl;
  const facebook = settings.facebook_url ?? SITE.facebookUrl;

  return (
    <section id="contact" className="bg-secondary/40 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">
            Location
          </p>
          <h2 className="font-heading text-4xl tracking-wide md:text-5xl">
            Train in <span className="text-brand">Plainfield</span>
          </h2>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="font-heading text-xl tracking-wide">
                {settings.business_name}
              </h3>
              <p className="mt-2 flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                {address || SITE.address.full}
              </p>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand" aria-hidden />
                <dt className="sr-only">Phone</dt>
                <dd>
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="font-medium hover:underline"
                  >
                    {phone}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand" aria-hidden />
                <dt className="sr-only">Email</dt>
                <dd>
                  <a href={`mailto:${email}`} className="font-medium hover:underline">
                    {email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hours</dt>
                <dd className="mt-1 font-medium">
                  {settings.business_hours ?? SITE.hoursPlaceholder}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-gold font-bold text-gold-foreground hover:bg-gold/90">
                <a href={`tel:${phone.replace(/\D/g, "")}`}>Call DAWGZ</a>
              </Button>
              <Button asChild variant="outline">
                <a href={`mailto:${email}`}>Send an Email</a>
              </Button>
              <Button asChild variant="outline">
                <a href={SITE.directionsUrl} target="_blank" rel="noopener noreferrer">
                  Get Directions
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={facebook} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message on Facebook
                </a>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <iframe
              title="DAWGZ Youth Training location map"
              src={mapUrl}
              className="h-[320px] w-full border-0 md:h-full md:min-h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
