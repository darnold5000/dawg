import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { allowIndexing } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!allowIndexing()) return [];

  const base = SITE.url;
  const paths = [
    "",
    "/schedule",
    "/packages",
    "/about",
    "/contact",
    "/privacy",
    "/booking-policy",
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
