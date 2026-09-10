import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Diagnostic route, and legacy areas that are being retired.
        disallow: ["/worker-check", "/signal/", "/news"],
      },
    ],
    sitemap: "https://mle-edge.dev/sitemap.xml",
  };
}
