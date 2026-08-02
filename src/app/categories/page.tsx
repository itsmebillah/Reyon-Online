import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui";
import { catalogRepository } from "@/features/catalog";
export default async function CategoriesPage() {
  const categories = await catalogRepository.listCategories();
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="Browse beautifully"
        title="Categories"
        body="Begin with the ritual that matters to you."
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
