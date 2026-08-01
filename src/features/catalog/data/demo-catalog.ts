import { businessConfig } from "@/config/business";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
} from "../domain/catalog";

const demonstrationBrand: CatalogBrand = {
  id: "brand_demo",
  slug: "demonstration-brand",
  name: "Demonstration Brand",
};

export const demoCategories: readonly CatalogCategory[] =
  businessConfig.categories.map((name, index) => ({
    id: `category_${index + 1}`,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    displayOrder: index + 1,
  }));

const skinCare = demoCategories[0];

if (!skinCare) {
  throw new Error("The approved business configuration requires Skin Care.");
}

const productImage = "/images/product-serum.png";

// Presentation fixtures only. These records are deliberately isolated from the
// catalog contract and must be replaced by Product Owner-approved assortment.
export const demoProducts: readonly CatalogProduct[] = [
  {
    id: "product_demo_renewal_serum",
    slug: "renewal-serum",
    brand: demonstrationBrand,
    name: "Renewal Barrier Serum",
    category: skinCare,
    variant: { label: "30 ml", sku: "DEMO-001" },
    offer: {
      price: { amount: 2850, currency: "BDT" },
      compareAtPrice: { amount: 3200, currency: "BDT" },
      availabilityLabel: "In stock",
    },
    merchandising: {
      badge: "Bestseller",
      isFeatured: true,
      isNewArrival: false,
    },
    content: {
      summary:
        "A considered daily ritual for skin that feels calm, balanced and replenished.",
    },
    media: {
      src: productImage,
      alt: "Unbranded demonstration serum bottle",
    },
  },
  {
    id: "product_demo_velvet_cleanser",
    slug: "velvet-cleanser",
    brand: demonstrationBrand,
    name: "Velvet Cream Cleanser",
    category: skinCare,
    variant: { label: "120 ml", sku: "DEMO-002" },
    offer: {
      price: { amount: 1950, currency: "BDT" },
      availabilityLabel: "In stock",
    },
    merchandising: {
      badge: "New",
      isFeatured: true,
      isNewArrival: true,
    },
    content: {
      summary:
        "A gentle cream cleanse designed to leave the complexion feeling soft and comfortable.",
    },
    media: { src: productImage, alt: "Unbranded demonstration cleanser" },
  },
  {
    id: "product_demo_luminous_essence",
    slug: "luminous-essence",
    brand: demonstrationBrand,
    name: "Luminous Hydration Essence",
    category: skinCare,
    variant: { label: "100 ml", sku: "DEMO-003" },
    offer: {
      price: { amount: 2400, currency: "BDT" },
      availabilityLabel: "Low stock",
    },
    merchandising: {
      isFeatured: true,
      isNewArrival: false,
    },
    content: {
      summary:
        "Lightweight hydration for a fresh, luminous-looking finish and a refined daily routine.",
    },
    media: { src: productImage, alt: "Unbranded demonstration essence" },
  },
  {
    id: "product_demo_restorative_cream",
    slug: "restorative-cream",
    brand: demonstrationBrand,
    name: "Restorative Night Cream",
    category: skinCare,
    variant: { label: "50 ml", sku: "DEMO-004" },
    offer: {
      price: { amount: 3100, currency: "BDT" },
      compareAtPrice: { amount: 3450, currency: "BDT" },
      availabilityLabel: "In stock",
    },
    merchandising: {
      badge: "Limited",
      isFeatured: true,
      isNewArrival: false,
    },
    content: {
      summary:
        "A rich evening moisturiser created for an unhurried moment of care before rest.",
    },
    media: { src: productImage, alt: "Unbranded demonstration face cream" },
  },
];

export const demoBrands: readonly CatalogBrand[] = [demonstrationBrand];
