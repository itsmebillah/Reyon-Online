import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
} from "./catalog";

export interface CatalogRepository {
  listProducts(query?: CatalogQuery): Promise<readonly CatalogProduct[]>;
  getProductBySlug(slug: string): Promise<CatalogProduct | undefined>;
  listBrands(): Promise<readonly CatalogBrand[]>;
  listCategories(): Promise<readonly CatalogCategory[]>;
}
