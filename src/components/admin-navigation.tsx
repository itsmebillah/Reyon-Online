"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  ChartNoAxesColumn,
  FolderTree,
  House,
  Images,
  PackageOpen,
  Tags,
  Truck,
  CreditCard,
  ClipboardList,
  Bell,
  BadgeDollarSign,
  RotateCcw,
  Handshake,
} from "lucide-react";

const groups = [
  {
    label: "Workspace",
    items: [{ label: "Overview", href: "/admin", icon: House }],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: PackageOpen },
      { label: "Brands", href: "/admin/brands", icon: Tags },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Product media", href: "/admin/media", icon: Images },
      {
        label: "Collections",
        href: "/admin/collections",
        icon: ChartNoAxesColumn,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ClipboardList },
      { label: "Sales", href: "/admin/sales", icon: BadgeDollarSign },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
      { label: "Suppliers", href: "/admin/suppliers", icon: Handshake },
      { label: "Delivery", href: "/admin/delivery", icon: Truck },
      { label: "Returns", href: "/admin/returns", icon: RotateCcw },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
    ],
  },
] as const;
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="admin-sidebar__nav" aria-label="Business OS modules">
      {groups.map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
