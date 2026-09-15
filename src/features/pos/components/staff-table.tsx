"use client";
import { useState } from "react";
import { invitePosEmployee, updatePosStaff } from "@/features/pos/actions";
type Staff = {
  userId: string;
  email: string;
  role: string;
  active: boolean;
  assigned: boolean;
  capabilities: string[];
};
export function StaffTable({
  locationId,
  staff,
  allCapabilities,
}: {
  locationId: string;
  staff: Staff[];
  allCapabilities: readonly string[];
}) {
  const [editing, setEditing] = useState<Staff | null>(null);
  const [status, setStatus] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  return (
    <>
      <section className="pos-panel" style={{ marginBottom: 16 }}>
        <h2>Create employee</h2>
        <p>
          An invitation is sent through Supabase Auth. No password is stored or
          selected by the POS.
        </p>
        <div className="pos-toolbar">
          <div className="pos-field" style={{ flex: 1 }}>
            <label>Email address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="employee@example.com"
            />
          </div>
          <button
            className="pos-button"
            disabled={inviting || !inviteEmail}
            onClick={async () => {
              setInviting(true);
              const result = await invitePosEmployee({
                email: inviteEmail,
                locationId,
                role: "staff",
                capabilities: [
                  "pos.access",
                  "pos.checkout",
                  "pos.open_shift",
                  "pos.close_shift",
                  "pos.cash_event",
                  "inventory.view",
                  "customers.manage",
                ],
              });
              setInviting(false);
              setStatus(result.error ?? "Invitation sent.");
              if (!result.error) setInviteEmail("");
            }}
          >
            {inviting ? "Inviting…" : "Invite cashier"}
          </button>
        </div>
        {status && (
          <p
            className={`pos-form-message ${status === "Invitation sent." ? "success" : ""}`}
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
              <th>Role</th>
              <th>Location</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.userId}>
                <td>{member.email}</td>
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
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                >
                  <option value="staff">Staff / cashier</option>
                  <option value="admin">Admin / manager</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
              <label className="pos-badge">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />{" "}
                Active employee
              </label>
              <section className="pos-section">
                <h3>Capabilities</h3>
                <div className="pos-fields">
                  {allCapabilities.map((cap) => (
                    <label key={cap}>
                      <input
                        type="checkbox"
                        checked={editing.capabilities.includes(cap)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            capabilities: e.target.checked
                              ? [...editing.capabilities, cap]
                              : editing.capabilities.filter(
                                  (item) => item !== cap,
                                ),
                          })
                        }
                      />{" "}
                      {cap}
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
