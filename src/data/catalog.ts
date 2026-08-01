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

export const products: Product[] = [
  {
    slug: "renewal-serum",
    brand: "REYON LAB",
    name: "Renewal Barrier Serum",
    category: "Skincare",
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
    brand: "REYON RITUAL",
    name: "Velvet Cream Cleanser",
    category: "Cleansers",
    size: "120 ml",
    price: 1950,
    badge: "New",
    stock: "In stock",
    description:
      "A gentle cream cleanse designed to leave the complexion feeling soft and comfortable.",
  },
  {
    slug: "luminous-essence",
    brand: "REYON LAB",
    name: "Luminous Hydration Essence",
    category: "Skincare",
    size: "100 ml",
    price: 2400,
    stock: "Low stock",
    description:
      "Lightweight hydration for a fresh, luminous-looking finish and a refined daily routine.",
  },
  {
    slug: "restorative-cream",
    brand: "REYON RITUAL",
    name: "Restorative Night Cream",
    category: "Moisturisers",
    size: "50 ml",
    price: 3100,
    compareAt: 3450,
    badge: "Limited",
    stock: "In stock",
    description:
      "A rich evening moisturiser created for an unhurried moment of care before rest.",
  },
];

export const categories = [
  "Skincare",
  "Cleansers",
  "Moisturisers",
  "Fragrance",
];

export const formatPrice = (price: number) =>
  `৳${price.toLocaleString("en-BD")}`;
