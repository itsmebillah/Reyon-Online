import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui";
import { catalogRepository } from "@/features/catalog";
export const metadata = {
  title: "Watch collections",
  alternates: { canonical: "/categories" },
};
export default async function CategoriesPage() {
  const categories = await catalogRepository.listCategories();
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="FIND YOUR STYLE"
        title="Watch collections"
        body="Classic, everyday or active. Find a watch for your day."
      />
      <div className="category-list">
        {categories.map((category, i) => (
          <Link href={`/shop?category=${category.slug}`} key={category.id}>
            <span>0{i + 1}</span>
            <h2>{category.name}</h2>
            <p>Explore collection →</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
