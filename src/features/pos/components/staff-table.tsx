"use client";

import { useState } from "react";
import { createPosEmployee, updatePosStaff } from "@/features/pos/actions";

type Staff = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  assigned: boolean;
  capabilities: string[];
};

const cashierCapabilities = [
  "pos.access",
  "pos.checkout",
  "pos.open_shift",
  "pos.close_shift",
  "pos.cash_event",
  "customers.manage",
] as const;

export function StaffTable({
  locationId,
  locations,
  staff,
  allCapabilities,
  canManageAdministrators,
}: {
  locationId: string;
  locations: readonly { id: string; name: string }[];
  staff: Staff[];
  allCapabilities: readonly string[];
  canManageAdministrators: boolean;
}) {
  const allowed = (items: readonly string[]) =>
    items.filter((capability) => allCapabilities.includes(capability));
  const [editing, setEditing] = useState<Staff | null>(null);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("123456");
  const [passwordConfirmation, setPasswordConfirmation] = useState("123456");
  const [employeeLocationId, setEmployeeLocationId] = useState(locationId);
  const [profile, setProfile] = useState("cashier");
  const [capabilities, setCapabilities] = useState(() =>
    allowed(cashierCapabilities),
  );
  const [active, setActive] = useState(true);
  const [creating, setCreating] = useState(false);

  function selectProfile(nextProfile: string) {
    const profiles: Record<string, readonly string[]> = {
      cashier: cashierCapabilities,
      manager: allCapabilities,
      inventory: [
        "pos.access",
        "inventory.view",
        "inventory.adjust",
        "catalog.manage",
        "purchasing.manage",
      ],
      accountant: ["pos.access", "reports.financial"],
      custom: capabilities,
    };
    setProfile(nextProfile);
    setCapabilities(allowed(profiles[nextProfile] ?? []));
  }

  return (
    <>
      <section className="pos-panel" style={{ marginBottom: 16 }}>
        <h2>Create employee</h2>
        <p>
          Create a login immediately. The temporary password is sent only to
          Supabase Auth and is never stored in Reyon tables.
        </p>
        <div className="pos-fields">
          <div className="pos-field">
            <label>Full name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="pos-field">
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@example.com"
              autoComplete="off"
            />
          </div>
          <div className="pos-field">
            <label>Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="pos-field">
            <label>Temporary password</label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="pos-field">
            <label>Confirm password</label>
            <input
              type="password"
              minLength={6}
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="pos-field">
            <label>Store / location</label>
            <select
              value={employeeLocationId}
              onChange={(event) => setEmployeeLocationId(event.target.value)}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="pos-field">
            <label>Access profile</label>
            <select
              value={profile}
              onChange={(event) => selectProfile(event.target.value)}
            >
              <option value="cashier">Cashier / Sales</option>
              <option value="manager">Manager</option>
              <option value="inventory">Inventory</option>
              <option value="accountant">Accountant</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        <section className="pos-section" style={{ marginTop: 16 }}>
          <h3>Permissions / access</h3>
          <div className="pos-fields">
            {allCapabilities.map((capability) => (
              <label key={capability}>
                <input
                  type="checkbox"
                  checked={capabilities.includes(capability)}
                  onChange={(event) => {
                    setProfile("custom");
                    setCapabilities((current) =>
                      event.target.checked
                        ? [...current, capability]
                        : current.filter((item) => item !== capability),
                    );
                  }}
                />{" "}
                {capability}
              </label>
            ))}
          </div>
        </section>
        <div className="pos-toolbar" style={{ marginTop: 16 }}>
          <label className="pos-badge">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />{" "}
            Active employee
          </label>
          <button
            className="pos-button"
            disabled={
              creating ||
              !name.trim() ||
              !email ||
              password.length < 6 ||
              password !== passwordConfirmation ||
              !employeeLocationId
            }
            onClick={async () => {
              setCreating(true);
              const result = await createPosEmployee({
                name,
                email,
                phone,
                password,
                passwordConfirmation,
                locationId: employeeLocationId,
                role: "staff",
                active,
                capabilities,
              });
              setCreating(false);
              setStatus(result.error ?? "Employee created.");
              if (!result.error) {
                setName("");
                setEmail("");
                setPhone("");
                setPassword("123456");
                setPasswordConfirmation("123456");
              }
            }}
          >
            {creating ? "Creating…" : "Create Employee"}
          </button>
        </div>
        {status && (
          <p
            className={`pos-form-message ${status === "Employee created." ? "success" : ""}`}
          >
            {status}
          </p>
        )}
      </section>

      <section className="pos-panel pos-table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Location</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.userId}>
                <td>
                  <strong>{member.name}</strong>
                  <br />
                  <small>{member.email}</small>
                </td>
                <td>{member.phone || "—"}</td>
                <td>{member.role}</td>
                <td>{member.assigned ? "Assigned" : "Not assigned"}</td>
                <td>{member.active ? "Active" : "Inactive"}</td>
                <td>
                  <button
                    className="pos-button pos-button--ghost"
                    onClick={() => setEditing(member)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing && (
        <div className="pos-modal-backdrop">
          <section className="pos-checkout">
            <header className="pos-modal-header">
              <div>
                <strong>Manage employee access</strong>
                <small>{editing.email}</small>
              </div>
              <button onClick={() => setEditing(null)}>×</button>
            </header>
            <div className="pos-checkout__body">
              <div className="pos-field">
                <label>Role</label>
                <select
                  value={editing.role}
                  onChange={(event) =>
                    setEditing({ ...editing, role: event.target.value })
                  }
                >
                  <option value="staff">Staff / employee</option>
                  {canManageAdministrators && (
                    <>
                      <option value="admin">Admin / manager</option>
                      <option value="super-admin">Super Admin</option>
                    </>
                  )}
                </select>
              </div>
              <label className="pos-badge">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) =>
                    setEditing({ ...editing, active: event.target.checked })
                  }
                />{" "}
                Active employee
              </label>
              <section className="pos-section">
                <h3>Capabilities</h3>
                <div className="pos-fields">
                  {allCapabilities.map((capability) => (
                    <label key={capability}>
                      <input
                        type="checkbox"
                        checked={editing.capabilities.includes(capability)}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            capabilities: event.target.checked
                              ? [...editing.capabilities, capability]
                              : editing.capabilities.filter(
                                  (item) => item !== capability,
                                ),
                          })
                        }
                      />{" "}
                      {capability}
                    </label>
                  ))}
                </div>
              </section>
              {status && <p className="pos-form-message">{status}</p>}
            </div>
            <footer className="pos-modal-actions">
              <button
                className="pos-button pos-button--ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                className="pos-button"
                onClick={async () => {
                  const result = await updatePosStaff({
                    userId: editing.userId,
                    locationId,
                    role: editing.role,
                    active: editing.active,
                    capabilities: editing.capabilities,
                  });
                  if (result.error) setStatus(result.error);
                  else {
                    setStatus("");
                    setEditing(null);
                  }
                }}
              >
                Save access
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
