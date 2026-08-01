import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui";
import { categories } from "@/data/catalog";
export default function CategoriesPage() {
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="Browse beautifully"
        title="Categories"
        body="Begin with the ritual that matters to you."
      />
      <div className="category-list">
        {categories.map((c, i) => (
          <Link href={`/shop?category=${c}`} key={c}>
            <span>0{i + 1}</span>
            <h2>{c}</h2>
            <p>Explore collection →</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
