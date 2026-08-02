import type { MetadataRoute } from "next";
import { catalogRepository } from "@/features/catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await catalogRepository.listProducts();
  const base = "https://reyon-online.vercel.app";
  const routes = ["", "/shop", "/categories", "/about", "/contact"];
  return [
    ...routes.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
