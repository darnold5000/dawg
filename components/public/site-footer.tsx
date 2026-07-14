import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, SITE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-ink text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <Image
              src="/images/dawg/logo.svg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="font-heading text-xl tracking-wide">{SITE.shortName}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Youth athletic training in Mooresville, Indiana — building strength,
            speed, agility, confidence, and discipline.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm tracking-widest text-brand">
            Navigate
          </h2>
          <ul className="space-y-2 text-sm text-white/80">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/schedule" className="hover:text-white">
                Book Training
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/booking-policy" className="hover:text-white">
                Booking Policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm tracking-widest text-brand">
            Contact
          </h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li>{SITE.address.full}</li>
            <li>
              <a href={SITE.phoneHref} className="hover:text-white">
                {SITE.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="hover:text-white">
                {SITE.email}
              </a>
            </li>
            <li>
              <a
                href={SITE.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p>
            Website by{" "}
            <a
              href={SITE.signalWorks.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 underline-offset-2 hover:text-white hover:underline"
            >
              {SITE.signalWorks.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
