import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { allowIndexing } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing()) {
    return {
      rules: [
        {
          userAgent: ["facebookexternalhit", "Facebot"],
          allow: "/",
        },
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/my/",
        "/intake",
        "/booking/success",
        "/booking/cancelled",
        "/packages/success",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
