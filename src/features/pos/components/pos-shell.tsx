"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  KeyRound,
  Menu,
  Package,
  ReceiptText,
  RotateCcw,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  UserRoundCog,
  X,
} from "lucide-react";
import type { PosContext } from "@/features/pos/types";
import { selectPosLocation } from "@/features/pos/actions";

const links = [
  ["/pos/dashboard", "Dashboard", LayoutDashboard, ["pos.access"]],
  ["/pos", "Sales POS", ShoppingCart, ["pos.checkout"]],
  ["/pos/sales", "Sales & invoices", ReceiptText, ["pos.access"]],
  ["/pos/returns", "Returns", RotateCcw, ["pos.refund"]],
  ["/pos/products", "Products", Package, ["inventory.view"]],
  ["/pos/inventory", "Inventory", Boxes, ["inventory.view"]],
  ["/pos/purchasing", "Suppliers & purchasing", Truck, ["purchasing.manage"]],
  ["/pos/customers", "Customers", Users, ["customers.manage"]],
  [
    "/pos/shifts",
    "Register & shifts",
    ClipboardList,
    ["pos.open_shift", "pos.close_shift", "pos.cash_event"],
  ],
  ["/pos/reports", "Reports", BarChart3, ["reports.financial"]],
  ["/pos/employees", "Employees", UserRoundCog, ["staff.manage"]],
  ["/pos/settings", "Store settings", Settings, ["settings.manage"]],
  ["/pos/account", "Account & password", KeyRound, ["pos.access"]],
] as const;

export function PosShell({
  context,
  children,
  selectedLocationId,
}: {
  context: PosContext;
  children: React.ReactNode;
  selectedLocationId?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location =
    context.locations.find((item) => item.id === selectedLocationId) ??
    context.locations[0];
  return (
    <div className={`pos-app ${collapsed ? "pos-app--collapsed" : ""}`}>
      <button
        className="pos-mobile-menu"
        onClick={() => setOpen(true)}
        aria-label="Open POS menu"
      >
        <Menu />
      </button>
      {open && (
        <button
          className="pos-sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close POS menu"
        />
      )}
      <aside className={`pos-sidebar ${open ? "pos-sidebar--open" : ""}`}>
        <div className="pos-brand">
          <span className="pos-brand__mark">
            <Store size={20} />
          </span>
          {!collapsed && (
            <span>
              <strong>REYON</strong>
              <small>Autopilot POS</small>
            </span>
          )}
          <button
            className="pos-sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        {!collapsed && (
          <div className="pos-location">
            {context.locations.length > 1 ? (
              <select
                aria-label="POS location"
                value={location?.id}
                onChange={async (event) => {
                  await selectPosLocation(event.target.value);
                  window.location.reload();
                }}
              >
                {context.locations.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>{location?.name ?? "No location"}</span>
            )}
            <small>{context.role}</small>
          </div>
        )}
        <nav className="pos-nav" aria-label="POS navigation">
          {links
            .filter(([, , , required]) =>
              required.some((capability) =>
                context.capabilities.includes(capability),
              ),
            )
            .map(([href, label, Icon]) => {
              const active =
                href === "/pos"
                  ? pathname === href || pathname === "/pos/register"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? "active" : ""}
                  title={label}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
        </nav>
        <div className="pos-sidebar__footer">
          {!collapsed && (
            <>
              <strong>{context.email}</strong>
              <small>Secure Reyon session</small>
            </>
          )}
          <button
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
      </aside>
      <main id="main" className="pos-main">
        {children}
      </main>
    </div>
  );
}
