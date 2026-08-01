import type { CatalogRepository } from "../domain/catalog-repository";
import type { CatalogProduct, CatalogQuery } from "../domain/catalog";
import { demoBrands, demoCategories, demoProducts } from "./demo-catalog";

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
  listProducts(query = {}) {
    const products = demoProducts.filter((product) =>
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
  getProductBySlug(slug) {
    return demoProducts.find((product) => product.slug === slug);
  },
  listBrands() {
    return demoBrands;
  },
  listCategories() {
    return demoCategories;
  },
};
