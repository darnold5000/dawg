import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  exactTitle?: boolean;
  siteName?: string;
  baseUrl?: string;
  /** Override robots. Default follows allowIndexing() for marketing pages. */
  index?: boolean;
}

/**
 * Public marketing pages are indexable on Vercel Production without a
 * dashboard flag. Preview, local, and an explicit `false` stay noindex.
 * `NEXT_PUBLIC_ALLOW_INDEXING=true` can force indexing (e.g. a custom preview).
 */
export function allowIndexing(): boolean {
  const explicit = process.env.NEXT_PUBLIC_ALLOW_INDEXING;
  if (explicit === "false") return false;
  if (explicit === "true") return true;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return false;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? SITE.url;
  if (!siteUrl || siteUrl.includes("localhost")) return false;
  return true;
}

function indexableRobots(index: boolean): NonNullable<Metadata["robots"]> {
  return {
    index,
    follow: index,
    googleBot: {
      index,
      follow: index,
    },
  };
}

export function createMetadata({
  title,
  description,
  path = "",
  image = "/images/dawg/og-default.svg",
  exactTitle = false,
  siteName = SITE.name,
  baseUrl = SITE.url,
  index,
}: SEOProps): Metadata {
  const url = `${baseUrl}${path}`;
  const imageUrl = new URL(image, baseUrl).toString();
  const fullTitle = exactTitle
    ? title
    : path === "" || path === "/"
      ? `${SITE.name} | ${title}`
      : `${title} | ${SITE.name}`;
  const shouldIndex = index ?? allowIndexing();

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName,
      locale: "en_US",
      type: "website",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
    robots: indexableRobots(shouldIndex),
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.line1,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.state,
      postalCode: SITE.address.postalCode,
      addressCountry: "US",
    },
    sameAs: [SITE.facebookUrl],
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/images/dawg/logo.jpg`,
    email: SITE.email,
    telephone: SITE.phone,
    sameAs: [SITE.facebookUrl],
  };
}
