import type { MetadataRoute } from "next";
import { absoluteUrl, isProductionEnv } from "@/lib/seo/urls";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionEnv()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel/", "/api/", "/studio/", "/auth/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
