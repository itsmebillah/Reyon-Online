import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/catalog";
import { formatPrice } from "@/data/catalog";
import { ProductActions } from "./store-actions";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
        >
          <Image
            src="/images/product-serum.png"
            alt={`Unbranded serum representing ${product.name}`}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
            priority={priority}
          />
        </Link>
        <div className="badge-stack">
          {product.badge && (
            <span className="badge badge--dark">{product.badge}</span>
          )}
          <span className="badge">{product.stock}</span>
        </div>
      </div>
      <div className="product-card__content">
        <p className="product-brand">{product.brand}</p>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-meta">{product.size}</p>
        <p className="price">
          {formatPrice(product.price)}{" "}
          {product.compareAt && <del>{formatPrice(product.compareAt)}</del>}
        </p>
        <ProductActions product={product} compact />
      </div>
    </article>
  );
}
