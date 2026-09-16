import {
  getSelectedPosLocation,
  requirePosCapability,
} from "@/features/pos/data/pos-access";
import { getPosCatalog } from "@/features/pos/data/pos-data";
import { InventoryAdjustment } from "@/features/pos/components/inventory-adjustment";
export default async function PosInventoryPage() {
  const context = await requirePosCapability("inventory.view");
  const location = await getSelectedPosLocation(context);
  const products = location ? await getPosCatalog(location.id) : [];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Inventory & stock</h1>
          <p>One ledger shared by the website, admin and physical POS</p>
        </div>
        <span className="pos-badge">{location?.name}</span>
      </header>
      {location && context.capabilities.includes("inventory.adjust") && (
        <InventoryAdjustment locationId={location.id} products={products} />
      )}
      <section className="pos-panel pos-table-wrap" style={{ marginTop: 16 }}>
        <table className="pos-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU / barcode</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <br />
                  <small>{product.variantLabel}</small>
                </td>
                <td>
                  {product.sku}
                  <br />
                  <small>{product.barcode || "No barcode"}</small>
                </td>
                <td>{product.onHand}</td>
                <td>{product.reserved}</td>
                <td>
                  <span
                    className={
                      product.stock <= 0
                        ? "pos-badge pos-badge--danger"
                        : "pos-badge"
                    }
                  >
                    {product.stock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
