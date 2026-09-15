import { notFound } from "next/navigation";
import { ReceiptPage } from "@/features/pos/components/receipt-page";
import { getPosReceipt } from "@/features/pos/data/pos-data";
export default async function PosReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getPosReceipt(id);
  if (!receipt) notFound();
  return <ReceiptPage receipt={receipt} />;
}
