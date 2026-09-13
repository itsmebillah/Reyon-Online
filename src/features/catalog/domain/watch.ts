export const watchFields = {
  model: "Model / reference",
  gender: "Gender",
  movement: "Movement",
  display: "Display",
  dialColor: "Dial color",
  caseColor: "Case color",
  caseMaterial: "Case material",
  strapMaterial: "Strap material",
  strapColor: "Strap color",
  caseSize: "Case size (mm)",
  waterResistance: "Water resistance",
  warranty: "Warranty & coverage",
} as const;
export type WatchSpecifications = Partial<
  Record<keyof typeof watchFields, string>
>;
export const watchCategories = [
  {
    slug: "classic-watches",
    name: "Classic & formal",
    description: "Considered details. Timeless proportions.",
    image: "/images/classic-watches.webp",
  },
  {
    slug: "casual-watches",
    name: "Everyday watches",
    description: "Made for your own pace.",
    image: "/images/casual-watches.webp",
  },
  {
    slug: "sports-watches",
    name: "Sport & adventure",
    description: "Find a watch for your active days.",
    image: "/images/sports-watches.webp",
  },
] as const;
