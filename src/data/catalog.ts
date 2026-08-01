import { businessConfig } from "@/config/business";

export type Product = {
  slug: string;
  brand: string;
  name: string;
  category: string;
  size: string;
  price: number;
  compareAt?: number;
  badge?: string;
  stock: "In stock" | "Low stock";
  description: string;
};

// Demonstration records only. Replace them with Product Owner-approved
// third-party brand assortment when the product catalog is connected.
export const products: Product[] = [
  {
    slug: "renewal-serum",
    brand: "Demonstration Brand",
    name: "Renewal Barrier Serum",
    category: "Skin Care",
    size: "30 ml",
    price: 2850,
    compareAt: 3200,
    badge: "Bestseller",
    stock: "In stock",
    description:
      "A considered daily ritual for skin that feels calm, balanced and replenished.",
  },
  {
    slug: "velvet-cleanser",
    brand: "Demonstration Brand",
    name: "Velvet Cream Cleanser",
    category: "Skin Care",
    size: "120 ml",
    price: 1950,
    badge: "New",
    stock: "In stock",
    description:
      "A gentle cream cleanse designed to leave the complexion feeling soft and comfortable.",
  },
  {
    slug: "luminous-essence",
    brand: "Demonstration Brand",
    name: "Luminous Hydration Essence",
    category: "Skin Care",
    size: "100 ml",
    price: 2400,
    stock: "Low stock",
    description:
      "Lightweight hydration for a fresh, luminous-looking finish and a refined daily routine.",
  },
  {
    slug: "restorative-cream",
    brand: "Demonstration Brand",
    name: "Restorative Night Cream",
    category: "Skin Care",
    size: "50 ml",
    price: 3100,
    compareAt: 3450,
    badge: "Limited",
    stock: "In stock",
    description:
      "A rich evening moisturiser created for an unhurried moment of care before rest.",
  },
];

export const categories = businessConfig.categories;

export const formatPrice = (price: number) =>
  `৳${price.toLocaleString(businessConfig.locale)}`;
