import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionCatalogStatus,
  catalogVariantTypes,
  getPrimaryImage,
  getProductBusinessReference,
  isCustomerVisibleCatalogStatus,
  validateCatalogProduct,
  type CatalogAdminProduct,
} from "../../src/features/catalog/domain/catalog-administration.ts";

const validPublishedProduct = (): CatalogAdminProduct => ({
  id: "8d401a11-d3bd-480b-ab60-c5657fa353a7",
  name: "Approved product fixture",
  brandId: "brand-1",
  primaryCategoryId: "category-1",
  status: "published",
  countryOfOriginCode: "KR",
  variants: [
    {
      id: "variant-1",
      type: "volume",
      label: "50 ml",
      sku: "fixture-sku-1",
      skuSource: "admin-provided",
      prices: [
        { type: "purchase", amount: "1000.00", currencyCode: "BDT" },
        { type: "selling", amount: "1500", currencyCode: "BDT" },
        { type: "compare-at", amount: "1700", currencyCode: "BDT" },
        { type: "discount", amount: "1400", currencyCode: "BDT" },
      ],
    },
  ],
  images: [
    { id: "image-2", displayOrder: 2 },
    { id: "image-1", displayOrder: 1 },
  ],
});

test("uses Product ID when custom Product Code is absent", () => {
  const product = validPublishedProduct();
  assert.equal(getProductBusinessReference(product), product.id);
  assert.equal(
    getProductBusinessReference({ ...product, productCode: " RY-100 " }),
    "RY-100",
  );
});

test("supports every approved variant type", () => {
  assert.deepEqual(catalogVariantTypes, [
    "size",
    "volume",
    "color",
    "shade",
    "weight",
    "pack-size",
  ]);
});

test("allows only the approved forward lifecycle", () => {
  assert.equal(canTransitionCatalogStatus("draft", "review"), true);
  assert.equal(canTransitionCatalogStatus("approved", "published"), true);
  assert.equal(canTransitionCatalogStatus("published", "hidden"), true);
  assert.equal(canTransitionCatalogStatus("hidden", "published"), false);
  assert.equal(canTransitionCatalogStatus("archived", "draft"), false);
});

test("exposes only Published products to customers", () => {
  assert.equal(isCustomerVisibleCatalogStatus("published"), true);
  for (const status of [
    "draft",
    "review",
    "approved",
    "hidden",
    "archived",
  ] as const) {
    assert.equal(isCustomerVisibleCatalogStatus(status), false);
  }
});

test("accepts approved product facts and chooses the first ordered image", () => {
  const product = validPublishedProduct();
  assert.deepEqual(validateCatalogProduct(product), []);
  assert.equal(getPrimaryImage(product)?.id, "image-1");
});

test("barcode remains optional", () => {
  const product = validPublishedProduct();
  assert.equal(product.variants[0]?.barcode, undefined);
  assert.deepEqual(validateCatalogProduct(product), []);
});

test("enforces universal product requirements in every lifecycle state", () => {
  const incomplete = {
    ...validPublishedProduct(),
    brandId: undefined,
    primaryCategoryId: undefined,
    variants: [],
    images: [],
  };
  const codes = validateCatalogProduct(incomplete).map(({ code }) => code);
  assert.deepEqual(codes, [
    "product-brand-required",
    "product-primary-category-required",
    "product-image-required",
    "publication-variant-required",
  ]);
  assert.deepEqual(
    validateCatalogProduct({ ...incomplete, status: "draft" }).map(
      ({ code }) => code,
    ),
    [
      "product-brand-required",
      "product-primary-category-required",
      "product-image-required",
    ],
  );
});

test("rejects duplicate variant identifiers and invalid exact-money input", () => {
  const variant = validPublishedProduct().variants[0];
  assert.ok(variant);
  const product: CatalogAdminProduct = {
    ...validPublishedProduct(),
    variants: [
      { ...variant, barcode: "880000000001" },
      {
        ...variant,
        id: "variant-2",
        barcode: "880000000001",
        prices: [
          { type: "selling", amount: "-1", currencyCode: "bdt" },
          { type: "selling", amount: "1.234", currencyCode: "BDT" },
        ],
      },
    ],
  };
  const codes = validateCatalogProduct(product).map(({ code }) => code);
  assert.deepEqual(codes, [
    "sku-duplicate",
    "barcode-duplicate",
    "price-amount-invalid",
    "price-currency-invalid",
    "price-type-duplicate",
    "price-amount-invalid",
  ]);
});
