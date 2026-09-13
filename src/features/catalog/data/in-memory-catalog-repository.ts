import { cache } from "react";
import { getSupabasePublicConfig } from "@/config/supabase";
import type { CatalogRepository } from "../domain/catalog-repository";
import type { CatalogProduct, CatalogQuery } from "../domain/catalog";
export async function catalogRpc<T>(
  name: string,
  body: object = {},
): Promise<T> {
  const { url, publishableKey } = getSupabasePublicConfig();
  const response = await fetch(url + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 60, tags: ["watch-catalog", "watch-categories"] },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      "The watch catalog is temporarily unavailable. Please try again.",
    );
  return response.json() as Promise<T>;
}
const productBySlug = cache(
  async (slug: string) =>
    (
      await catalogRpc<CatalogProduct[]>("watch_catalog", {
        p_query: { slug, limit: 1 },
      })
    )[0],
);
const products = (query: CatalogQuery = {}) =>
  catalogRpc<CatalogProduct[]>("watch_catalog", { p_query: query }).then(
    (items) =>
      items.map((product) => ({
        ...product,
        name: product.name.replace(/\s+[â€”-]\s+Demo$/i, ""),
        content: {
          ...product.content,
          summary: product.content.summary.replace(
            /^Demo catalog item for testing the REYON watch storefront\.?$/i,
            "A considered REYON watch with clear specifications and dependable everyday wear.",
          ),
        },
        media: {
          ...product.media,
          alt: product.media.alt.replace(/\s+demo$/i, ""),
        },
      })),
  );
export const catalogRepository: CatalogRepository = {
  listProducts: products,
  getProductBySlug: productBySlug,
  listCategories: () => catalogRpc("watch_categories"),
  listBrands: () => catalogRpc("watch_brands"),
  listCollection: (key) =>
    products(
      key === "best-sellers"
        ? { sort: "bestsellers", limit: 4 }
        : key === "offers"
          ? { offers: true, limit: 4 }
          : { sort: "newest", limit: 4 },
    ),
  async listHomepageCollections() {
    const definitions = [
      {
        key: "new-arrivals",
        name: "New arrivals",
        query: { sort: "newest", limit: 4 },
      },
      {
        key: "best-sellers",
        name: "Customer favourites",
        query: { sort: "bestsellers", limit: 4 },
      },
      {
        key: "offers",
        name: "Worth a closer look",
        query: { offers: true, limit: 4 },
      },
    ] as const;
    return Promise.all(
      definitions.map(async (d, i) => ({
        key: d.key,
        name: d.name,
        displayOrder: i,
        products: await products(d.query),
      })),
    );
  },
};
