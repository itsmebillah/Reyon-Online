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
  id: CatalogId;
  slug: string;
  brand: CatalogBrand;
  name: string;
  category: CatalogCategory;
  variant: Readonly<{
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

export type CatalogSort = "featured" | "newest" | "price-asc";

export type CatalogQuery = Readonly<{
  category?: string;
  search?: string;
  sort?: CatalogSort;
}>;
