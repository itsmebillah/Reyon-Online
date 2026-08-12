"use client";

import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { getCartSummary } from "@/features/cart/actions";
import { Container } from "./ui";

const links = [
  ["Shop", "/shop"],
  ["Categories", "/categories"],
  ["New arrivals", "/shop?sort=new"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();
  useEffect(() => {
    void getCartSummary().then((cart) => setCartCount(cart.itemCount));
    const refresh = () =>
      void getCartSummary().then((cart) => setCartCount(cart.itemCount));
    window.addEventListener("reyon:cart-updated", refresh);
    return () => window.removeEventListener("reyon:cart-updated", refresh);
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = String(data.get("q") ?? "").trim();
    if (query) {
      setSearch(false);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  return (
    <header className="site-header">
      <div className="announcement">
        Complimentary delivery on orders over ৳3,500
      </div>
      <Container className="nav-row">
        <button
          className="nav-mobile"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <Link
          className="brand-logo brand-logo--header"
          href="/"
          aria-label="REYON home"
        >
          <span className="header-logo-mark" aria-hidden="true">
            <Image
              className="header-logo header-logo--mark-source"
              src="/images/reyon-logo-primary.png"
              alt=""
              width={126}
              height={126}
              priority
            />
          </span>
          <Image
            className="header-logo header-logo--wordmark"
            src="/images/reyon-wordmark-horizontal.webp"
            alt="REYON Beauty & Care"
            width={640}
            height={246}
            priority
          />
        </Link>
        <nav
          className={`primary-nav ${open ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <button aria-label="Search" onClick={() => setSearch(!search)}>
            <Search />
          </button>
          <Link href="/account" aria-label="Account">
            <UserRound />
          </Link>
          <Link
            href="/cart"
            aria-label={`Shopping bag with ${cartCount} items`}
          >
            <ShoppingBag />
            <span className="cart-count">{cartCount}</span>
          </Link>
        </div>
      </Container>
      {search && (
        <form className="search-panel" onSubmit={submit}>
          <Container>
            <label htmlFor="header-search">What are you looking for?</label>
            <div>
              <Search />
              <input
                id="header-search"
                name="q"
                autoFocus
                placeholder="Search skincare, fragrance and more"
              />
              <button type="submit">Search</button>
            </div>
          </Container>
        </form>
      )}
    </header>
  );
}
