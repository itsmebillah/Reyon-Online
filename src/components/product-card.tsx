import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/features/catalog";
import { formatMoney } from "@/features/catalog";
import { ProductActions } from "./store-actions";

export function ProductCard({
  product,
  priority = false,
}: {
  product: CatalogProduct;
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
            src={product.media.src}
            alt={product.media.alt}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
            priority={priority}
            unoptimized={product.media.src.startsWith("http")}
          />
        </Link>
        <div className="badge-stack">
          {product.merchandising.badge && (
            <span className="badge badge--dark">
              {product.merchandising.badge}
            </span>
          )}
          <span className="badge">{product.offer.availabilityLabel}</span>
        </div>
      </div>
      <div className="product-card__content">
        <p className="product-brand">{product.brand.name}</p>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-meta">{product.variant.label}</p>
        <p className="price">
          {formatMoney(product.offer.price)}{" "}
          {product.offer.compareAtPrice && (
            <del>{formatMoney(product.offer.compareAtPrice)}</del>
          )}
        </p>
        <ProductActions product={product} compact />
      </div>
    </article>
  );
}
