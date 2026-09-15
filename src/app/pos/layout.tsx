import "./pos.css";
import { PosShell } from "@/features/pos/components/pos-shell";
import { requirePosAccess } from "@/features/pos/data/pos-access";
import { getSelectedPosLocation } from "@/features/pos/data/pos-access";

export const dynamic = "force-dynamic";

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  return (
    <PosShell context={context} selectedLocationId={location?.id}>
      {children}
    </PosShell>
  );
}
