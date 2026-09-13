export type CatalogId = string;

export type CatalogBrand = Readonly<{
  id: CatalogId;
  slug: string;
  name: string;
}>;

export type CatalogCategory = Readonly<{
  id: CatalogId;
  slug: string;
  name: string;
  displayOrder: number;
}>;

export type Money = Readonly<{
  amount: number;
  currency: "BDT";
}>;

export type CatalogProduct = Readonly<{
  specifications?: import("./watch").WatchSpecifications;
  gallery?: readonly Readonly<{ src: string; alt: string }>[];
  variants?: readonly Readonly<{
    id: string;
    label: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    available: number;
  }>[];
  publishedAt?: string;
  id: CatalogId;
  slug: string;
  brand: CatalogBrand;
  name: string;
  category: CatalogCategory;
  variant: Readonly<{
    id?: string;
    label: string;
    sku: string;
  }>;
  offer: Readonly<{
    price: Money;
    compareAtPrice?: Money;
    availabilityLabel: "In stock" | "Low stock" | "Out of stock";
  }>;
  merchandising: Readonly<{
    badge?: string;
    isFeatured: boolean;
    isNewArrival: boolean;
  }>;
  content: Readonly<{
    summary: string;
  }>;
  media: Readonly<{
    src: string;
    alt: string;
  }>;
}>;

export type CatalogSort =
  "featured" | "newest" | "price-asc" | "price-desc" | "bestsellers";

export type CatalogQuery = Readonly<{
  category?: string;
  search?: string;
  sort?: CatalogSort;
  brand?: string;
  gender?: string;
  movement?: string;
  strap?: string;
  min?: number;
  max?: number;
  available?: boolean;
  offers?: boolean;
  page?: number;
  limit?: number;
}>;
