import type { MetadataRoute } from "next";
import { businessConfig } from "@/config/business";
import { catalogRpc } from "@/features/catalog/data/in-memory-catalog-repository";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products =
    await catalogRpc<{ slug: string; updatedAt: string }[]>("watch_sitemap");
  const base = businessConfig.productionUrl;
  return [
    ...[
      "",
      "/shop",
      "/categories",
      "/about",
      "/contact",
      "/shipping",
      "/returns",
      "/privacy",
      "/terms",
    ].map((r) => ({ url: base + r })),
    ...products.map((p) => ({
      url: base + "/products/" + p.slug,
      lastModified: new Date(p.updatedAt),
    })),
  ];
}
