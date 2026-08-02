import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
} from "./catalog";

export type CatalogCollection = Readonly<{
  key: string;
  name: string;
  displayOrder: number;
  products: readonly CatalogProduct[];
}>;

export interface CatalogRepository {
  listProducts(query?: CatalogQuery): Promise<readonly CatalogProduct[]>;
  listCollection(collectionKey: string): Promise<readonly CatalogProduct[]>;
  listHomepageCollections(): Promise<readonly CatalogCollection[]>;
  getProductBySlug(slug: string): Promise<CatalogProduct | undefined>;
  listBrands(): Promise<readonly CatalogBrand[]>;
  listCategories(): Promise<readonly CatalogCategory[]>;
}
