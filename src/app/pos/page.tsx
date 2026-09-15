import { PosRegister } from "@/features/pos/components/pos-register";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import {
  getPosCatalog,
  getPosSettings,
  getPosShifts,
} from "@/features/pos/data/pos-data";

export default async function PosPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const [products, shifts, settings] = location
    ? await Promise.all([
        getPosCatalog(location.id),
        getPosShifts(location.id),
        getPosSettings(location.id),
      ])
    : [[], [], {}];
  return (
    <PosRegister
      context={{ ...context, locations: location ? [location] : [] }}
      products={products ?? []}
      shifts={shifts ?? []}
      defaultTaxRate={Number(
        (settings as Record<string, string | number | null>).taxRate ?? 0,
      )}
    />
  );
}
