import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business OS",
  robots: { index: false, follow: false },
};

const modules: readonly Readonly<{
  name: string;
  description: string;
  status: "Available" | "Next" | "Planned";
  href?: string;
}>[] = [
  {
    name: "Brands",
    description: "Manage trusted product brands",
    status: "Available",
    href: "/admin/brands",
  },
  {
    name: "Categories",
    description: "Organize the approved catalog",
    status: "Available",
    href: "/admin/categories",
  },
  {
    name: "Products",
    description: "Create and publish product records",
    status: "Next",
  },
  {
    name: "Media",
    description: "Prepare expanded product galleries",
    status: "Planned",
  },
  {
    name: "Inventory",
    description: "Enter variant-level stock",
    status: "Planned",
  },
  {
    name: "Publication",
    description: "Review website visibility",
    status: "Planned",
  },
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
            <span>{module.status}</span>
            <h2>{module.name}</h2>
            <p>{module.description}</p>
            {module.href && (
              <Link className="button button--primary" href={module.href}>
                Manage {module.name.toLowerCase()}
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
