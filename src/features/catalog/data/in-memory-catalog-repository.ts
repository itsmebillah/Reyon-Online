import { cache } from "react";
import { getSupabasePublicConfig } from "@/config/supabase";
import type { CatalogRepository } from "../domain/catalog-repository";
import type { CatalogProduct, CatalogQuery } from "../domain/catalog";
import { watchCategories } from "../domain/watch";

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

const cleanProduct = (product: CatalogProduct): CatalogProduct => ({
  ...product,
  name: product.name.replace(/\s+Demo$/i, "").replace(/\s+[—-]\s*$/i, ""),
  brand: {
    ...product.brand,
    name: product.brand.name.replace(/\s+Demo(?:\s+Collection)?$/i, ""),
  },
  content: {
    ...product.content,
    summary: product.content.summary.replace(
      /^Demo catalog item for testing the REYON watch storefront\.?$/i,
      "A considered REYON watch with clear specifications and dependable everyday wear.",
    ),
  },
  media: { ...product.media, alt: product.media.alt.replace(/\s+demo$/i, "") },
});

const products = (query: CatalogQuery = {}) =>
  catalogRpc<CatalogProduct[]>("watch_catalog", { p_query: query }).then(
    (items) => items.map(cleanProduct),
  );
const productBySlug = cache(async (slug: string) => {
  const items = await catalogRpc<CatalogProduct[]>("watch_catalog", {
    p_query: { slug, limit: 1 },
  });
  return items[0] ? cleanProduct(items[0]) : undefined;
});

export const catalogRepository: CatalogRepository = {
  listProducts: products,
  getProductBySlug: productBySlug,
  listCategories: async () => {
    try {
      return await catalogRpc("watch_categories");
    } catch {
      return watchCategories.map((category, index) => ({
        id: category.slug,
        slug: category.slug,
        name: category.name,
        description: category.description,
        displayOrder: index,
      }));
    }
  },
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
