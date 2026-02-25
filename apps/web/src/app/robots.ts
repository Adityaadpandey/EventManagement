import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/lister", "/auth", "/profile", "/checker"],
      },
    ],
    sitemap: "https://www.tixin.in/sitemap.xml",
  };
}
