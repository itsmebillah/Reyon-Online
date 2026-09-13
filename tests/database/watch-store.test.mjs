import test from "node:test";
import assert from "node:assert/strict";
import { database, seedWatch } from "../helpers/database.mjs";
test("fresh migrations, anonymous catalog and role boundaries execute in PostgreSQL", async () => {
  const db = await database();
  try {
    await db.exec("set role anon");
    assert.deepEqual(
      (await db.query("select public.watch_catalog() value")).rows[0].value,
      [],
    );
    assert.equal(
      (await db.query("select jsonb_array_length(public.watch_categories()) n"))
        .rows[0].n,
      3,
    );
    await assert.rejects(
      db.query(
        "select public.admin_configure_delivery_partner('test','Test',true)",
      ),
    );
    await db.exec("reset role; set role authenticated");
    await assert.rejects(
      db.query(
        "select public.admin_configure_delivery_partner('test','Test',true)",
      ),
      /Admin permission/,
    );
    await assert.rejects(
      db.query(
        "select public.admin_decide_manual_payment(gen_random_uuid(),'verified',null)",
      ),
      /permission/,
    );
    await assert.rejects(
      db.query(
        "select public.customer_sales_documents(gen_random_uuid(),'RYN-2026-000001','01712345678')",
      ),
      /browser/,
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select accounting.can_configure() allowed")).rows[0]
        .allowed,
      false,
    );
  } finally {
    await db.close();
  }
});

test("watch variants, authoritative delivery, checkout and private aftercare", async () => {
  const db = await database();
  try {
    const { pid, vid } = await seedWatch(db);
    await db.exec("set role anon");
    const rpc = async (name, args = []) => {
      const placeholders = args.map((_, i) => "$" + (i + 1)).join(",");
      return (
        await db.query(
          "select public." + name + "(" + placeholders + ") value",
          args,
        )
      ).rows[0].value;
    };
    const products = await rpc("watch_catalog", [{}]);
    assert.equal(products.length, 1);
    assert.equal(products[0].variants[0].id, vid);
    assert.equal(products[0].offer.price.amount, 2500);
    assert.equal((await rpc("watch_catalog", [{ gender: "men" }])).length, 0);
    assert.equal((await rpc("watch_catalog", [{ min: 2600 }])).length, 0);
    const token = "22222222-2222-4222-8222-222222222222";
    await rpc("watch_cart_add_item", [token, pid, vid, 2]);
    await assert.rejects(
      rpc("checkout_save_watch_address", [
        token,
        "Test Customer",
        "123",
        "Dhaka",
        "Dhanmondi",
        "Test house road",
        "",
      ]),
      /mobile/,
    );
    await rpc("checkout_save_watch_address", [
      token,
      "Test Customer",
      "01712345678",
      "Dhaka",
      "Dhanmondi",
      "Test house road",
      "Leave a note",
    ]);
    const state = await rpc("checkout_order_state", [token]);
    assert.equal(state.deliveryCharge, 70);
    const methods = (
      await db.query("select * from public.checkout_payment_methods()")
    ).rows;
    const cod = methods.find((m) => m.method_kind === "cod");
    await rpc("checkout_select_payment", [token, cod.id, null]);
    const order = await rpc("checkout_confirm_order", [token]);
    assert.ok(order.orderId);
    const success = await rpc("checkout_order_success", [
      order.successAccessToken,
    ]);
    assert.equal(success.totalAmount, 5070);
    const retry = await rpc("checkout_confirm_order", [token]);
    assert.equal(retry.orderId, order.orderId);
    await assert.rejects(
      rpc("customer_delivery_status", [
        "33333333-3333-4333-8333-333333333333",
        success.orderReference,
        "+8801712345678",
      ]),
      /browser/,
    );
    await db.exec("reset role");
    const lines = (
      await db.query(
        "select quantity from sales.order_lines where order_id=$1",
        [order.orderId],
      )
    ).rows;
    assert.equal(Number(lines[0].quantity), 2);
    const snapshot = (
      await db.query(
        "select delivery_note,watch_snapshots from sales.watch_order_evidence where order_id=$1",
        [order.orderId],
      )
    ).rows[0];
    assert.equal(snapshot.delivery_note, "Leave a note");
    assert.equal(snapshot.watch_snapshots[0].specifications.model, "TEST-001");
  } finally {
    await db.close();
  }
});
