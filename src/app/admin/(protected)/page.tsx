import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business OS",
  robots: { index: false, follow: false },
};

const modules: readonly Readonly<{
  name: string;
  description: string;
  status: "Available" | "Configure";
  group: "Catalog" | "Operations";
  href?: string;
}>[] = [
  {
    name: "Brands",
    description: "Manage trusted product brands",
    status: "Available",
    href: "/admin/brands",
    group: "Catalog",
  },
  {
    name: "Categories",
    description: "Organize the approved catalog",
    status: "Available",
    href: "/admin/categories",
    group: "Catalog",
  },
  {
    name: "Products",
    description: "Create and publish product records",
    status: "Available",
    href: "/admin/products",
    group: "Catalog",
  },
  {
    name: "Collections",
    description: "Configure dynamic homepage merchandising",
    status: "Available",
    href: "/admin/collections",
    group: "Catalog",
  },
  {
    name: "Media",
    description: "Manage validated product galleries",
    status: "Available",
    href: "/admin/media",
    group: "Catalog",
  },
  {
    name: "Inventory",
    description: "Enter variant-level stock",
    status: "Available",
    href: "/admin/inventory",
    group: "Operations",
  },
  {
    name: "Delivery",
    description: "Configure delivery zones and charges",
    status: "Configure",
    href: "/admin/delivery",
    group: "Operations",
  },
] as const;

export default function AdminHomePage() {
  return (
    <section className="admin-dashboard" aria-labelledby="admin-title">
      <div className="admin-dashboard__intro">
        <p className="eyebrow">Operations</p>
        <h1 id="admin-title">Your business workspace</h1>
        <p>Manage catalog and daily operations from one clear workspace.</p>
        <div className="admin-quick-actions">
          <Link className="button button--primary" href="/admin/products">
            Add product
          </Link>
          <Link className="button button--secondary" href="/admin/inventory">
            Enter inventory
          </Link>
        </div>
      </div>
      {(["Catalog", "Operations"] as const).map((group) => (
        <section className="admin-module-section" key={group}>
          <div className="admin-section-heading">
            <h2>{group}</h2>
            <span>
              {modules.filter((module) => module.group === group).length}{" "}
              modules
            </span>
          </div>
          <div className="admin-module-grid">
            {modules
              .filter((module) => module.group === group)
              .map((module) => (
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
      ))}
    </section>
  );
}
