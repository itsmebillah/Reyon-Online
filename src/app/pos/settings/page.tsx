import { SettingsForm } from "@/features/pos/components/settings-form";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosSettings } from "@/features/pos/data/pos-data";
export default async function PosSettingsPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const settings = location ? await getPosSettings(location.id) : {};
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Store settings</h1>
          <p>Location-scoped receipt, invoice, tax and register presentation</p>
        </div>
      </header>
      {location && context.capabilities.includes("settings.manage") ? (
        <SettingsForm locationId={location.id} initial={settings ?? {}} />
      ) : (
        <section className="pos-panel pos-empty">
          You do not have settings management permission.
        </section>
      )}
    </div>
  );
}
