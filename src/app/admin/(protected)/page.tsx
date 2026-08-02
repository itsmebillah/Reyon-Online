import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business OS",
  robots: { index: false, follow: false },
};

const modules: readonly Readonly<{
  name: string;
  description: string;
  next?: boolean;
}>[] = [
  { name: "Brands", description: "Manage trusted product brands", next: true },
  { name: "Categories", description: "Organize the approved catalog" },
  { name: "Products", description: "Create and review product records" },
  { name: "Media", description: "Prepare product imagery" },
  { name: "Inventory", description: "Enter variant-level stock" },
  { name: "Publication", description: "Review website visibility" },
] as const;

export default function AdminHomePage() {
  return (
    <section className="admin-dashboard" aria-labelledby="admin-title">
      <div>
        <p className="eyebrow">Operations</p>
        <h1 id="admin-title">Your business workspace</h1>
        <p>
          A focused home for managing REYON. Operational modules will activate
          in roadmap order as their verified workflows are released.
        </p>
      </div>
      <div className="admin-module-grid">
        {modules.map((module) => (
          <article className="admin-module-card" key={module.name}>
            <span>{module.next ? "Next" : "Planned"}</span>
            <h2>{module.name}</h2>
            <p>{module.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
