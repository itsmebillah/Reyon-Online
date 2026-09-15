export type PosRegister = Readonly<{ id: string; name: string; code: string }>;
export type PosLocation = Readonly<{
  id: string;
  name: string;
  code: string;
  registers: readonly PosRegister[];
}>;
export type PosContext = Readonly<{
  userId: string;
  email: string;
  role: string;
  locations: readonly PosLocation[];
  capabilities: readonly string[];
}>;
export type PosProduct = Readonly<{
  id: string;
  productId: string;
  name: string;
  variantLabel: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  onHand: number;
  reserved: number;
  imageUrl: string | null;
}>;
export type PosShift = Readonly<{
  id: string;
  registerId: string;
  register: string;
  operatorId: string;
  openedAt: string;
  openingCash: number;
  closedAt: string | null;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  sales: number;
}>;
export type PosTenderInput = Readonly<{
  method: "cash" | "card" | "mobile" | "bank-transfer";
  amount: number;
  reference?: string;
}>;
export type PosReceipt = Readonly<{
  orderId: string;
  orderNumber: string;
  invoiceNumber: number;
  receiptNumber: number | null;
  occurredAt: string;
  currency: string;
  gross: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  paid: number;
  tendered: number;
  change: number;
  due: number;
  paymentStatus: string;
  customerName: string | null;
  customerPhone: string | null;
  cashier: string;
  notes: string | null;
  location: string;
  register: string;
  settings: null | Readonly<{
    business_name: string;
    address: string | null;
    phone: string | null;
    logo_url: string | null;
    currency_symbol: string;
    receipt_size: "58mm" | "80mm" | "a4";
    footer: string | null;
    return_policy: string | null;
  }>;
  items: readonly Readonly<{
    name: string;
    variant: string | null;
    sku: string | null;
    quantity: number;
    price: number;
    total: number;
  }>[];
  tenders: readonly Readonly<{
    method: string;
    tendered: number;
    applied: number;
    reference: string | null;
  }>[];
}>;
