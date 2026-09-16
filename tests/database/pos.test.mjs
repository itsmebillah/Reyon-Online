import test from "node:test";
import assert from "node:assert/strict";
import { database, seedWatch } from "../helpers/database.mjs";

async function authenticate(db, userId) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userId,
  ]);
  await db.exec("set role authenticated");
}

async function configurePosting(db, admin) {
  await db.exec("reset role");
  const organizationId = (
    await db.query(
      "select id from organization.organizations where code='reyon-online'",
    )
  ).rows[0].id;
  const definitions = [
    ["1000", "POS Clearing", "asset", "current-assets", "debit"],
    ["4000", "Product Sales", "revenue", "sales", "credit"],
    ["4010", "Delivery Revenue", "revenue", "sales", "credit"],
    ["4020", "Sales Discounts", "contra-revenue", "sales", "debit"],
  ];
  const accounts = [];
  for (const definition of definitions) {
    accounts.push(
      (
        await db.query(
          `insert into accounting.ledger_accounts(
            organization_id,code,display_name,account_class,account_group,
            normal_balance,approved_at,approved_by
          ) values($1,$2,$3,$4,$5,$6,statement_timestamp(),$7) returning id`,
          [organizationId, ...definition, admin],
        )
      ).rows[0].id,
    );
  }
  await db.query(
    `insert into accounting.financial_accounts(
      organization_id,ledger_account_id,account_kind,display_name,created_by
    ) values($1,$2,'cod-clearing','POS Clearing',$3)`,
    [organizationId, accounts[0], admin],
  );
  for (const [purpose, account] of [
    ["product-sales", accounts[1]],
    ["delivery-revenue", accounts[2]],
    ["sales-discounts", accounts[3]],
  ]) {
    await db.query(
      "insert into accounting.posting_account_mappings values($1,$2,$3,statement_timestamp(),$4)",
      [organizationId, purpose, account, admin],
    );
  }
  await db.query(
    `update accounting.organization_profiles set posting_enabled=true,
      activated_at=statement_timestamp(),activated_by=$2 where organization_id=$1`,
    [organizationId, admin],
  );
}

async function posSession(db, admin) {
  await authenticate(db, admin);
  const context = (await db.query("select public.pos_context() value")).rows[0]
    .value;
  const location = context.locations[0];
  const register = location.registers[0];
  return { context, location, register };
}

function saleRequest(session, variantId, key, quantity = 1) {
  return {
    idempotencyKey: key,
    locationId: session.location.id,
    registerId: session.register.id,
    items: [{ variantId, quantity }],
    discountType: "FIXED",
    discountValue: 100,
    taxRate: 0,
    tenders: [{ method: "cash", amount: quantity * 2500 }],
  };
}

test("POS is deny-by-default and location/capability scoped", async () => {
  const db = await database();
  try {
    assert.equal(
      (await db.query("select public.pos_context() value")).rows[0].value,
      null,
    );
    await db.exec("set role anon");
    await assert.rejects(db.query("select public.pos_context()"), /permission/);
    await assert.rejects(db.query("select * from pos.registers"), /permission/);
    await db.exec("reset role");
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select public.pos_open_shift(gen_random_uuid(),0)"),
      /permission/,
    );
  } finally {
    await db.close();
  }
});

test("staff capabilities default safely and support explicit denial", async () => {
  const db = await database();
  try {
    const admin = "11111111-1111-4111-8111-111111111111";
    const staff = "22222222-2222-4222-8222-222222222222";
    await db.query(
      "insert into auth.users(id,email) values($1,'admin@example.invalid'),($2,'cashier@example.invalid')",
      [admin, staff],
    );
    await db.query(
      "insert into access.admin_memberships(user_id,role_key) values($1,'super-admin'),($2,'staff')",
      [admin, staff],
    );
    await authenticate(db, staff);
    const context = (await db.query("select public.pos_context() value"))
      .rows[0].value;
    assert.ok(context.capabilities.includes("pos.checkout"));
    assert.ok(context.capabilities.includes("inventory.view"));
    assert.ok(!context.capabilities.includes("inventory.adjust"));
    assert.ok(!context.capabilities.includes("reports.financial"));
    await db.exec("reset role");
    await db.query(
      "insert into access.member_capability_overrides(user_id,capability_key,is_granted) values($1,'pos.checkout',false)",
      [staff],
    );
    await authenticate(db, staff);
    const denied = (await db.query("select public.pos_context() value")).rows[0]
      .value;
    assert.ok(!denied.capabilities.includes("pos.checkout"));
    await assert.rejects(
      db.query("select public.pos_checkout($1::jsonb)", [
        JSON.stringify({
          idempotencyKey: "checkout-capability-denied",
          locationId: context.locations[0].id,
          registerId: context.locations[0].registers[0].id,
          items: [
            {
              variantId: "99999999-9999-4999-8999-999999999999",
              quantity: 1,
            },
          ],
          tenders: [],
        }),
      ]),
      /POS checkout permission required/,
    );
  } finally {
    await db.close();
  }
});

test("POS reads and commands reject an unassigned location", async () => {
  const db = await database();
  try {
    const admin = "33333333-3333-4333-8333-333333333333";
    await db.query(
      "insert into auth.users(id,email) values($1,'location-staff@example.invalid')",
      [admin],
    );
    await db.query(
      "insert into access.admin_memberships(user_id,role_key) values($1,'staff')",
      [admin],
    );
    const organizationId = (
      await db.query(
        "select id from organization.organizations where code='reyon-online'",
      )
    ).rows[0].id;
    const secondLocation = (
      await db.query(
        `insert into organization.locations(organization_id,code,display_name,kind_key)
         values($1,'second-store','Second Store','store') returning id`,
        [organizationId],
      )
    ).rows[0].id;
    const secondRegister = (
      await db.query(
        `insert into pos.registers(organization_id,location_id,code,display_name)
         values($1,$2,'second-register','Second Register') returning id`,
        [organizationId, secondLocation],
      )
    ).rows[0].id;
    await authenticate(db, admin);
    assert.equal(
      (
        await db.query("select public.pos_catalog($1,null) value", [
          secondLocation,
        ])
      ).rows[0].value,
      null,
    );
    await assert.rejects(
      db.query("select public.pos_open_shift($1,0)", [secondRegister]),
      /permission required/,
    );
  } finally {
    await db.close();
  }
});

test("staff administration is location scoped and cannot escalate privileges", async () => {
  const db = await database();
  try {
    const manager = "44444444-4444-4444-8444-444444444441";
    const employee = "44444444-4444-4444-8444-444444444442";
    const remoteEmployee = "44444444-4444-4444-8444-444444444443";
    const administrator = "44444444-4444-4444-8444-444444444444";
    await db.query(
      `insert into auth.users(id,email) values
       ($1,'manager@example.invalid'),($2,'employee@example.invalid'),
       ($3,'remote@example.invalid'),($4,'administrator@example.invalid')`,
      [manager, employee, remoteEmployee, administrator],
    );
    await db.query(
      `insert into access.admin_memberships(user_id,role_key) values
       ($1,'staff'),($2,'staff'),($3,'staff'),($4,'admin')`,
      [manager, employee, remoteEmployee, administrator],
    );
    const organizationId = (
      await db.query(
        "select id from organization.organizations where code='reyon-online'",
      )
    ).rows[0].id;
    const mainLocation = (
      await db.query(
        "select id from organization.locations where organization_id=$1 and code='main-inventory'",
        [organizationId],
      )
    ).rows[0].id;
    const secondLocation = (
      await db.query(
        `insert into organization.locations(organization_id,code,display_name,kind_key)
         values($1,'remote-store','Remote Store','store') returning id`,
        [organizationId],
      )
    ).rows[0].id;
    await db.query(
      "delete from access.member_location_assignments where user_id=$1",
      [remoteEmployee],
    );
    await db.query(
      `insert into access.member_location_assignments(user_id,location_id)
       values($1,$2)`,
      [remoteEmployee, secondLocation],
    );
    await db.query(
      `insert into access.member_capability_overrides(user_id,capability_key,is_granted)
       values($1,'staff.manage',true)`,
      [manager],
    );

    await authenticate(db, manager);
    await db.query(
      "select public.pos_set_staff_profile($1,$2,'Example Employee','01700000000')",
      [employee, mainLocation],
    );
    const staff = (
      await db.query("select public.pos_staff($1) value", [mainLocation])
    ).rows[0].value;
    const employeeRecord = staff.find((member) => member.userId === employee);
    assert.equal(employeeRecord.name, "Example Employee");
    assert.equal(employeeRecord.phone, "01700000000");
    assert.ok(!staff.some((member) => member.userId === remoteEmployee));
    assert.ok(!staff.some((member) => member.userId === administrator));
    assert.equal(
      Number(
        (
          await db.query(
            `select count(*) count from information_schema.columns
             where table_schema='access' and table_name='employee_profiles'
               and column_name ilike '%password%'`,
          )
        ).rows[0].count,
      ),
      0,
    );
    await assert.rejects(
      db.query(
        "select public.pos_set_staff_access($1,$2,'staff',true,$3::jsonb)",
        [employee, mainLocation, JSON.stringify(["settings.manage"])],
      ),
      /cannot grant a capability/,
    );
    await assert.rejects(
      db.query(
        "select public.pos_set_staff_access($1,$2,'admin',true,'[]'::jsonb)",
        [employee, mainLocation],
      ),
      /Only a Super Admin can assign administrator roles/,
    );
    await assert.rejects(
      db.query(
        "select public.pos_set_staff_access($1,$2,'staff',true,'[]'::jsonb)",
        [administrator, mainLocation],
      ),
      /Only a Super Admin can manage administrator accounts/,
    );
  } finally {
    await db.close();
  }
});

test("POS CSV import is atomic, canonical and idempotent", async () => {
  const db = await database();
  try {
    const { admin } = await seedWatch(db);
    await authenticate(db, admin);
    const context = (await db.query("select public.pos_context() value"))
      .rows[0].value;
    await db.exec("reset role");
    const source = (
      await db.query(`select p.brand_id,pc.category_id,pm.asset_id
        from catalog.products p
        join catalog.product_categories pc on pc.product_id=p.id
        join catalog.product_media pm on pm.product_id=p.id
        where pm.asset_id is not null limit 1`)
    ).rows[0];
    const row = {
      p_name: "Atomic CSV Watch",
      p_slug: "atomic-csv-watch",
      p_brand_id: source.brand_id,
      p_category_id: source.category_id,
      p_variant_label: "Black",
      p_sku: "CSV-ATOMIC-1",
      p_barcode: "8801234567890",
      p_purchase_price: 1000,
      p_selling_price: 1500,
      p_asset_id: source.asset_id,
      p_image_alt: "Atomic CSV Watch",
      p_country_code: "BD",
      p_publish: true,
      specifications: { model: "CSV-1", gender: "unisex" },
      description: "Imported through POS",
    };
    await authenticate(db, admin);
    const first = (
      await db.query(
        "select public.pos_bulk_import_products($1,$2,$3::jsonb) value",
        [context.locations[0].id, "csv-import-key", JSON.stringify([row])],
      )
    ).rows[0].value;
    const retry = (
      await db.query(
        "select public.pos_bulk_import_products($1,$2,$3::jsonb) value",
        [context.locations[0].id, "csv-import-key", JSON.stringify([row])],
      )
    ).rows[0].value;
    assert.equal(first.imported, 1);
    assert.deepEqual(retry.productIds, first.productIds);
    await assert.rejects(
      db.query("select public.pos_bulk_import_products($1,$2,$3::jsonb)", [
        context.locations[0].id,
        "csv-import-key",
        JSON.stringify([{ ...row, p_sku: "CHANGED" }]),
      ]),
      /different input/,
    );
    await db.exec("reset role");
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from catalog.products where slug='atomic-csv-watch'",
          )
        ).rows[0].count,
      ),
      1,
    );
  } finally {
    await db.close();
  }
});

test("POS checkout needs no shift and remains canonical, transactional and idempotent", async () => {
  const db = await database();
  try {
    const { vid, admin } = await seedWatch(db);
    await configurePosting(db, admin);
    const session = await posSession(db, admin);
    const request = saleRequest(session, vid, "pos-idempotency-test");
    const first = (
      await db.query("select public.pos_checkout($1::jsonb) value", [
        JSON.stringify(request),
      ])
    ).rows[0].value;
    const retry = (
      await db.query("select public.pos_checkout($1::jsonb) value", [
        JSON.stringify(request),
      ])
    ).rows[0].value;
    assert.equal(retry.orderId, first.orderId);
    assert.equal(first.invoiceNumber, 1);
    assert.ok(first.receiptNumber);
    assert.equal(first.total, 2400);
    assert.equal(first.change, 100);
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select shift_id from pos.sale_details where order_id=$1",
          [first.orderId],
        )
      ).rows[0].shift_id,
      null,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select available from inventory.stock_position where catalog_variant_id=$1 and location_id=$2",
            [vid, session.location.id],
          )
        ).rows[0].available,
      ),
      7,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from sales.orders where source_namespace='physical-pos'",
          )
        ).rows[0].count,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from accounting.journal_entries where source_namespace='completed-sale'",
          )
        ).rows[0].count,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from payments.payment_records where source_namespace='physical-pos'",
          )
        ).rows[0].count,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from inventory.movements where idempotency_key='pos-stock:pos-idempotency-test'",
          )
        ).rows[0].count,
      ),
      1,
    );
  } finally {
    await db.close();
  }
});

test("an accounting failure rolls back the complete POS transaction", async () => {
  const db = await database();
  try {
    const { vid, admin } = await seedWatch(db);
    const session = await posSession(db, admin);
    await assert.rejects(
      db.query("select public.pos_checkout($1::jsonb)", [
        JSON.stringify(saleRequest(session, vid, "pos-accounting-rollback")),
      ]),
      /Accounting configuration/,
    );
    await db.exec("reset role");
    assert.equal(
      Number(
        (
          await db.query(
            "select count(*) count from sales.orders where source_namespace='physical-pos'",
          )
        ).rows[0].count,
      ),
      0,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "select available from inventory.stock_position where catalog_variant_id=$1 and location_id=$2",
            [vid, session.location.id],
          )
        ).rows[0].available,
      ),
      8,
    );
  } finally {
    await db.close();
  }
});

test("website reservations and POS checkout cannot oversell shared stock", async () => {
  const db = await database();
  try {
    const { pid, vid, admin } = await seedWatch(db);
    await configurePosting(db, admin);
    const session = await posSession(db, admin);
    await db.exec("reset role; set role anon");
    const token = "55555555-5555-4555-8555-555555555555";
    await db.query("select public.watch_cart_add_item($1,$2,$3,1)", [
      token,
      pid,
      vid,
    ]);
    await db.query(
      "select public.checkout_save_watch_address($1,'Web Customer','01712345678','Dhaka','Dhanmondi','Test address','')",
      [token],
    );
    const method = (
      await db.query(
        "select id from public.checkout_payment_methods() where method_kind='cod'",
      )
    ).rows[0].id;
    await db.query("select public.checkout_select_payment($1,$2,null)", [
      token,
      method,
    ]);
    await db.query("select public.checkout_confirm_order($1)", [token]);
    await authenticate(db, admin);
    await assert.rejects(
      db.query("select public.pos_checkout($1::jsonb)", [
        JSON.stringify(saleRequest(session, vid, "pos-shared-last-stock", 8)),
      ]),
      /Insufficient stock/,
    );
  } finally {
    await db.close();
  }
});

test("two POS retries cannot sell the same last stock twice", async () => {
  const db = await database();
  try {
    const { vid, admin } = await seedWatch(db);
    await configurePosting(db, admin);
    const session = await posSession(db, admin);
    const attempts = await Promise.allSettled([
      db.query("select public.pos_checkout($1::jsonb)", [
        JSON.stringify(saleRequest(session, vid, "pos-concurrent-a", 8)),
      ]),
      db.query("select public.pos_checkout($1::jsonb)", [
        JSON.stringify(saleRequest(session, vid, "pos-concurrent-b", 8)),
      ]),
    ]);
    assert.equal(
      attempts.filter((attempt) => attempt.status === "fulfilled").length,
      1,
    );
    assert.equal(
      attempts.filter((attempt) => attempt.status === "rejected").length,
      1,
    );
    await db.exec("reset role");
    assert.equal(
      Number(
        (
          await db.query(
            "select available from inventory.stock_position where catalog_variant_id=$1 and location_id=$2",
            [vid, session.location.id],
          )
        ).rows[0].available,
      ),
      0,
    );
  } finally {
    await db.close();
  }
});
