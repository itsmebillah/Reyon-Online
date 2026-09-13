import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

export async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema extensions;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('sub',auth.uid(),'email','test@example.invalid')$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
grant usage on schema public,auth,storage to anon,authenticated;`);
  for (const f of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    try {
      await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
    } catch (e) {
      await db.close();
      throw new Error(f + ": " + e.message, { cause: e });
    }
  }
  return db;
}

export async function seedWatch(db) {
  const admin = "11111111-1111-4111-8111-111111111111";
  await db.query(
    "insert into auth.users(id,email) values($1,'admin@example.invalid')",
    [admin],
  );
  await db.query("insert into access.admin_memberships(user_id) values($1)", [
    admin,
  ]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
  const brand = (
    await db.query(
      "insert into catalog.brands(slug,name) values('test-watch-brand','Test Watch Brand') returning id",
    )
  ).rows[0].id;
  const category = (
    await db.query(
      "select id from catalog.categories where slug='classic-watches'",
    )
  ).rows[0].id;
  const asset = (
    await db.query(
      "select public.admin_create_media_asset('supabase-storage','test-watch.webp','https://example.invalid/test-watch.webp','image/webp',1000,1000) id",
    )
  ).rows[0].id;
  const input = {
    p_name: "Test Everyday Watch",
    p_slug: "test-everyday-watch",
    p_brand_id: brand,
    p_category_id: category,
    p_variant_label: "Blue dial / leather",
    p_sku: "TEST-WATCH-001",
    p_barcode: null,
    p_purchase_price: 1000,
    p_selling_price: 2500,
    p_compare_at_price: 3000,
    p_discount_price: null,
    p_asset_id: asset,
    p_image_alt: "Test watch fixture",
    p_country_code: null,
    p_product_code: null,
    p_publish: true,
    specifications: {
      model: "TEST-001",
      gender: "unisex",
      movement: "Quartz",
      strapMaterial: "Leather",
      warranty: "Test fixture only",
    },
    description: "A watch fixture used only by automated tests.",
  };
  const pid = (
    await db.query("select public.admin_create_watch($1::jsonb) id", [
      JSON.stringify(input),
    ])
  ).rows[0].id;
  const vid = (
    await db.query("select id from catalog.variants where product_id=$1", [pid])
  ).rows[0].id;
  await db.query(
    "update catalog.product_media set storage_path='/images/watch-hero.webp' where product_id=$1",
    [pid],
  );
  const location = (
    await db.query(
      "select id from organization.locations where code='main-inventory'",
    )
  ).rows[0].id;
  await db.query(
    "select public.admin_record_inventory_movement($1,$2,'opening-stock',8,'Test fixture',null)",
    [vid, location],
  );
  await db.exec(
    "update fulfillment.delivery_zones set is_enabled=true,charge_amount=case when zone_key='inside-dhaka' then 70 else 130 end;select set_config('request.jwt.claim.sub','',false)",
  );
  return { pid, vid, admin };
}
