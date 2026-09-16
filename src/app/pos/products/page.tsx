import Link from "next/link";
import {
  getSelectedPosLocation,
  requirePosCapability,
} from "@/features/pos/data/pos-access";
import { getPosCatalog } from "@/features/pos/data/pos-data";
import { BarcodeLabels } from "@/features/pos/components/barcode-labels";
import { ProductCsvImport } from "@/features/pos/components/product-csv-import";
import { getProductOptions } from "@/features/catalog/data/product-management";
import { listMediaLibrary } from "@/features/catalog/data/product-media-management";
export default async function PosProductsPage() {
  const context = await requirePosCapability("inventory.view");
  const location = await getSelectedPosLocation(context);
  const canManage = context.capabilities.includes("catalog.manage");
  const [products, options, assets] = await Promise.all([
    location ? getPosCatalog(location.id) : [],
    canManage ? getProductOptions() : null,
    canManage ? listMediaLibrary() : [],
  ]);
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Products</h1>
          <p>Canonical products, variants, prices, SKUs and barcodes</p>
        </div>
        <div className="pos-toolbar">
          <BarcodeLabels products={products} />
          {canManage && location && options && (
            <ProductCsvImport
              locationId={location.id}
              brands={options.brands}
              categories={options.categories.filter((category) =>
                [
                  "classic-watches",
                  "casual-watches",
                  "sports-watches",
                ].includes(category.slug),
              )}
              assets={assets}
            />
          )}
          {canManage && (
            <Link className="pos-button" href="/admin/products">
              Create / edit products
            </Link>
          )}
        </div>
      </header>
      <section className="pos-panel pos-table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Price</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <br />
                  <small>{p.variantLabel}</small>
                </td>
                <td>{p.category}</td>
                <td>{p.sku}</td>
                <td>{p.barcode || "—"}</td>
                <td>৳{Number(p.price).toLocaleString()}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
