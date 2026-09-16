import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("login routes platform/admin users and POS employees to separate workspaces", () => {
  const login = source("src/app/admin/login/actions.ts");
  const adminAccess = source("src/features/access/data/admin-access.ts");
  assert.match(login, /hasAdminWorkspace/);
  assert.match(login, /context\.role/);
  assert.match(login, /"\/pos\/dashboard"/);
  assert.match(login, /"\/admin"/);
  assert.match(adminAccess, /context\.role === "staff"/);
  assert.match(adminAccess, /forbidden\(\)/);
});

test("POS navigation and direct pages use effective capabilities", () => {
  const shell = source("src/features/pos/components/pos-shell.tsx");
  const access = source("src/features/pos/data/pos-access.ts");
  const inventory = source("src/app/pos/inventory/page.tsx");
  const reports = source("src/app/pos/reports/page.tsx");
  const employees = source("src/app/pos/employees/page.tsx");
  const staffTable = source("src/features/pos/components/staff-table.tsx");
  assert.match(shell, /context\.capabilities\.includes\(capability\)/);
  assert.match(access, /requirePosCapability/);
  assert.match(access, /forbidden\(\)/);
  assert.match(inventory, /requirePosCapability\("inventory\.view"\)/);
  assert.match(reports, /requirePosCapability\("reports\.financial"\)/);
  assert.match(employees, /requirePosCapability\("staff\.manage"\)/);
  assert.match(employees, /context\.role === "super-admin"/);
  assert.match(staffTable, /canManageAdministrators/);
});

test("closed register presents only authorized shift-open action", () => {
  const register = source("src/features/pos/components/pos-register.tsx");
  assert.match(register, /canOpenShift/);
  assert.match(register, />Register Closed</);
  assert.match(register, /Open Register \/ Start Shift/);
  assert.match(
    register,
    /Your account does not have permission to open this register/,
  );
});

test("employee creation uses direct Supabase Auth accounts without invitations", () => {
  const actions = source("src/features/pos/actions.ts");
  const table = source("src/features/pos/components/staff-table.tsx");
  assert.match(actions, /admin\.auth\.admin\.createUser/);
  assert.match(actions, /email_confirm: true/);
  assert.match(actions, /user_metadata/);
  assert.match(actions, /pos_set_staff_access/);
  assert.match(actions, /pos_set_staff_profile/);
  assert.doesNotMatch(actions, /inviteUserByEmail/);
  assert.match(table, /useState\("123456"\)/);
  assert.match(table, /Create Employee/);
});

test("every authenticated workspace exposes current-password verification", () => {
  const shell = source("src/features/pos/components/pos-shell.tsx");
  const adminNavigation = source("src/components/admin-navigation.tsx");
  const action = source("src/features/access/actions/change-password.ts");
  assert.match(shell, /Account & password/);
  assert.match(adminNavigation, /Change password/);
  assert.match(action, /currentPassword/);
  assert.match(action, /signInWithPassword/);
  assert.match(action, /updateUser\(\{ password \}\)/);
});
