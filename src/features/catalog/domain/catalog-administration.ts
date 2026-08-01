import type { CatalogId } from "./catalog";

export const catalogStatuses = [
  "draft",
  "review",
  "approved",
  "published",
  "hidden",
  "archived",
] as const;

export type CatalogStatus = (typeof catalogStatuses)[number];

export const catalogVariantTypes = [
  "size",
  "volume",
  "color",
  "shade",
  "weight",
  "pack-size",
] as const;

export type CatalogVariantType = (typeof catalogVariantTypes)[number];
export type CatalogSkuSource = "system-generated" | "admin-provided";
export type CatalogPriceType =
  "purchase" | "selling" | "compare-at" | "discount";

export type CatalogPrice = Readonly<{
  type: CatalogPriceType;
  amount: string;
  currencyCode: string;
}>;

export type CatalogAdminVariant = Readonly<{
  id: CatalogId;
  type: CatalogVariantType;
  label: string;
  sku: string;
  skuSource: CatalogSkuSource;
  barcode?: string;
  prices: readonly CatalogPrice[];
}>;

export type CatalogAdminProduct = Readonly<{
  id: CatalogId;
  productCode?: string;
  name: string;
  brandId?: CatalogId;
  primaryCategoryId?: CatalogId;
  status: CatalogStatus;
  countryOfOriginCode?: string;
  variants: readonly CatalogAdminVariant[];
  images: readonly Readonly<{
    id: CatalogId;
    displayOrder: number;
  }>[];
}>;

export type CatalogValidationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

const nextStatus: Readonly<Partial<Record<CatalogStatus, CatalogStatus>>> = {
  draft: "review",
  review: "approved",
  approved: "published",
  published: "hidden",
  hidden: "archived",
};

const decimalMoneyPattern = /^\d+(?:\.\d{1,2})?$/;
const currencyPattern = /^[A-Z]{3}$/;
const countryPattern = /^[A-Z]{2}$/;

export const getProductBusinessReference = (
  product: Pick<CatalogAdminProduct, "id" | "productCode">,
) => product.productCode?.trim() || product.id;

export const canTransitionCatalogStatus = (
  current: CatalogStatus,
  target: CatalogStatus,
) => nextStatus[current] === target;

export const isCustomerVisibleCatalogStatus = (status: CatalogStatus) =>
  status === "published";

export const validateCatalogProduct = (
  product: CatalogAdminProduct,
): readonly CatalogValidationIssue[] => {
  const issues: CatalogValidationIssue[] = [];

  if (!product.id.trim()) {
    issues.push({
      code: "product-id-required",
      path: "id",
      message: "A system-generated Product ID is required.",
    });
  }

  if (
    product.countryOfOriginCode &&
    !countryPattern.test(product.countryOfOriginCode)
  ) {
    issues.push({
      code: "country-code-invalid",
      path: "countryOfOriginCode",
      message:
        "Country of Origin must use a two-letter uppercase country code.",
    });
  }

  const skus = new Set<string>();
  const barcodes = new Set<string>();
  for (const [variantIndex, variant] of product.variants.entries()) {
    const sku = variant.sku.trim();
    if (!sku) {
      issues.push({
        code: "sku-required",
        path: `variants.${variantIndex}.sku`,
        message: "Every sellable variant requires a SKU.",
      });
    } else if (skus.has(sku)) {
      issues.push({
        code: "sku-duplicate",
        path: `variants.${variantIndex}.sku`,
        message: "Every sellable variant must have a unique SKU.",
      });
    }
    skus.add(sku);

    const barcode = variant.barcode?.trim();
    if (barcode) {
      if (barcodes.has(barcode)) {
        issues.push({
          code: "barcode-duplicate",
          path: `variants.${variantIndex}.barcode`,
          message: "A manufacturer barcode cannot identify two variants.",
        });
      }
      barcodes.add(barcode);
    }

    const priceTypes = new Set<CatalogPriceType>();
    for (const [priceIndex, price] of variant.prices.entries()) {
      if (priceTypes.has(price.type)) {
        issues.push({
          code: "price-type-duplicate",
          path: `variants.${variantIndex}.prices.${priceIndex}.type`,
          message: "A variant can have only one current price of each type.",
        });
      }
      priceTypes.add(price.type);

      if (!decimalMoneyPattern.test(price.amount)) {
        issues.push({
          code: "price-amount-invalid",
          path: `variants.${variantIndex}.prices.${priceIndex}.amount`,
          message:
            "Price must be a non-negative amount with up to two decimals.",
        });
      }
      if (!currencyPattern.test(price.currencyCode)) {
        issues.push({
          code: "price-currency-invalid",
          path: `variants.${variantIndex}.prices.${priceIndex}.currencyCode`,
          message: "Price currency must use a three-letter uppercase code.",
        });
      }
    }
  }

  if (!product.brandId) {
    issues.push({
      code: "product-brand-required",
      path: "brandId",
      message: "Every product requires exactly one product brand.",
    });
  }
  if (!product.primaryCategoryId) {
    issues.push({
      code: "product-primary-category-required",
      path: "primaryCategoryId",
      message: "Every product requires one primary category.",
    });
  }
  if (product.images.length === 0) {
    issues.push({
      code: "product-image-required",
      path: "images",
      message: "Every product requires at least one product image.",
    });
  }

  if (product.status === "published") {
    if (product.variants.length === 0) {
      issues.push({
        code: "publication-variant-required",
        path: "variants",
        message: "Publication requires at least one sellable variant.",
      });
    }
  }

  return issues;
};

export const getPrimaryImage = (product: CatalogAdminProduct) =>
  [...product.images].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  )[0];
