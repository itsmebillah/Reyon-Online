import type { CatalogRepository } from "../domain/catalog-repository";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
} from "../domain/catalog";
import { demoBrands, demoCategories, demoProducts } from "./demo-catalog";
import { getSupabasePublicConfig } from "@/config/supabase";

type PublishedCatalogRow = Readonly<{
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  brand_slug: string;
  brand_name: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  category_display_order: number;
  variant_label: string;
  sku: string;
  price_amount: number | string;
  compare_at_amount: number | string | null;
  availability_label: string;
  image_url: string;
  image_alt: string;
  published_at: string;
}>;

const loadPublishedProducts = async (): Promise<readonly CatalogProduct[]> => {
  try {
    const { url, publishableKey } = getSupabasePublicConfig();
    const response = await fetch(`${url}/rest/v1/rpc/published_catalog`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as PublishedCatalogRow[];
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      brand: { id: row.brand_id, slug: row.brand_slug, name: row.brand_name },
      category: {
        id: row.category_id,
        slug: row.category_slug,
        name: row.category_name,
        displayOrder: row.category_display_order,
      },
      variant: { label: row.variant_label, sku: row.sku },
      offer: {
        price: { amount: Number(row.price_amount), currency: "BDT" },
        ...(row.compare_at_amount === null
          ? {}
          : {
              compareAtPrice: {
                amount: Number(row.compare_at_amount),
                currency: "BDT" as const,
              },
            }),
        availabilityLabel:
          row.availability_label === "Low stock" ? "Low stock" : "In stock",
      },
      merchandising: { isFeatured: false, isNewArrival: true },
      content: {
        summary: `${row.brand_name} ${row.name} in ${row.variant_label}.`,
      },
      media: { src: row.image_url, alt: row.image_alt },
    }));
  } catch {
    return [];
  }
};

const loadVisibleCategories = async (): Promise<
  readonly CatalogCategory[] | null
> => {
  try {
    const { url, publishableKey } = getSupabasePublicConfig();
    const response = await fetch(`${url}/rest/v1/rpc/visible_categories`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as ReadonlyArray<{
      id: string;
      slug: string;
      name: string;
      display_order: number;
    }>;
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      displayOrder: row.display_order,
    }));
  } catch {
    return null;
  }
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const matchesQuery = (product: CatalogProduct, query: CatalogQuery) => {
  const categoryMatches =
    !query.category || product.category.slug === normalize(query.category);
  const searchable = normalize(
    `${product.brand.name} ${product.name} ${product.category.name} ${product.variant.label}`,
  );
  const searchMatches =
    !query.search || searchable.includes(normalize(query.search));
  return categoryMatches && searchMatches;
};

export const catalogRepository: CatalogRepository = {
  async listProducts(query = {}) {
    const published = await loadPublishedProducts();
    const products = [...published, ...demoProducts].filter((product) =>
      matchesQuery(product, query),
    );

    if (query.sort === "price-asc") {
      return [...products].sort(
        (left, right) => left.offer.price.amount - right.offer.price.amount,
      );
    }

    if (query.sort === "newest") {
      return [...products].sort(
        (left, right) =>
          Number(right.merchandising.isNewArrival) -
          Number(left.merchandising.isNewArrival),
      );
    }

    return products;
  },
  async getProductBySlug(slug) {
    return (await this.listProducts()).find((product) => product.slug === slug);
  },
  async listBrands() {
    const products = await loadPublishedProducts();
    return [...demoBrands, ...products.map((product) => product.brand)].filter(
      (brand, index, all) =>
        all.findIndex((item) => item.id === brand.id) === index,
    );
  },
  async listCategories() {
    return (await loadVisibleCategories()) ?? demoCategories;
  },
};
