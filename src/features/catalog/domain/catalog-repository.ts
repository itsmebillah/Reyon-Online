import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
  CatalogQuery,
} from "./catalog";

export interface CatalogRepository {
  listProducts(query?: CatalogQuery): readonly CatalogProduct[];
  getProductBySlug(slug: string): CatalogProduct | undefined;
  listBrands(): readonly CatalogBrand[];
  listCategories(): readonly CatalogCategory[];
}
