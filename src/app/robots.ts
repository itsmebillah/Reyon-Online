import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/cart", "/checkout", "/account", "/search"],
    },
    sitemap: businessConfig.productionUrl + "/sitemap.xml",
  };
}
