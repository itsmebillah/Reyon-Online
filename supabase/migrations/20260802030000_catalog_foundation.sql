-- REYON Business OS: policy-neutral product catalog persistence foundation.
-- This migration is additive. It intentionally creates no anon/authenticated
-- access policies and inserts no demonstration or production assortment data.

create schema if not exists catalog;

revoke all on schema catalog from public, anon, authenticated;
grant usage on schema catalog to service_role;

create or replace function catalog.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function catalog.set_updated_at() from public, anon, authenticated;

create table catalog.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint brands_name_present check (btrim(name) <> ''),
  constraint brands_slug_unique unique (slug)
);

create table catalog.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references catalog.categories(id) on delete restrict,
  slug text not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_name_present check (btrim(name) <> ''),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id),
  constraint categories_slug_unique unique (slug)
);

create table catalog.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references catalog.brands(id) on delete restrict,
  slug text not null,
  name text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_name_present check (btrim(name) <> ''),
  constraint products_slug_unique unique (slug)
);

create table catalog.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog.products(id) on delete restrict,
  sku text not null,
  barcode text,
  label text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint variants_sku_present check (btrim(sku) <> ''),
  constraint variants_label_present check (btrim(label) <> ''),
  constraint variants_barcode_present check (barcode is null or btrim(barcode) <> ''),
  constraint variants_sku_unique unique (sku),
  constraint variants_barcode_unique unique (barcode)
);

create table catalog.product_categories (
  product_id uuid not null references catalog.products(id) on delete restrict,
  category_id uuid not null references catalog.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (product_id, category_id)
);

create unique index product_categories_one_primary_per_product
  on catalog.product_categories(product_id)
  where is_primary;

create table catalog.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog.products(id) on delete restrict,
  storage_path text not null,
  alt_text text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint product_media_storage_path_present check (btrim(storage_path) <> ''),
  constraint product_media_alt_text_present check (alt_text is null or btrim(alt_text) <> ''),
  constraint product_media_path_unique unique (storage_path)
);

create unique index product_media_one_primary_per_product
  on catalog.product_media(product_id)
  where is_primary;

create table catalog.offers (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references catalog.variants(id) on delete restrict,
  channel_key text not null,
  currency_code text not null,
  price_amount numeric(18, 2) not null,
  compare_at_amount numeric(18, 2),
  availability_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint offers_channel_key_format check (channel_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint offers_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint offers_price_nonnegative check (price_amount >= 0),
  constraint offers_compare_at_nonnegative check (compare_at_amount is null or compare_at_amount >= 0),
  constraint offers_window_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint offers_variant_channel_unique unique (variant_id, channel_key)
);

create index variants_product_id_idx on catalog.variants(product_id);
create index products_brand_id_idx on catalog.products(brand_id);
create index product_categories_category_id_idx on catalog.product_categories(category_id);
create index product_media_product_id_order_idx on catalog.product_media(product_id, display_order);
create index offers_channel_key_idx on catalog.offers(channel_key);

create trigger brands_set_updated_at before update on catalog.brands
for each row execute function catalog.set_updated_at();
create trigger categories_set_updated_at before update on catalog.categories
for each row execute function catalog.set_updated_at();
create trigger products_set_updated_at before update on catalog.products
for each row execute function catalog.set_updated_at();
create trigger variants_set_updated_at before update on catalog.variants
for each row execute function catalog.set_updated_at();
create trigger product_media_set_updated_at before update on catalog.product_media
for each row execute function catalog.set_updated_at();
create trigger offers_set_updated_at before update on catalog.offers
for each row execute function catalog.set_updated_at();

alter table catalog.brands enable row level security;
alter table catalog.categories enable row level security;
alter table catalog.products enable row level security;
alter table catalog.variants enable row level security;
alter table catalog.product_categories enable row level security;
alter table catalog.product_media enable row level security;
alter table catalog.offers enable row level security;

revoke all on all tables in schema catalog from public, anon, authenticated;
grant all on all tables in schema catalog to service_role;

comment on schema catalog is
  'Private product catalog system of record. Access policies require separately approved workflows.';
comment on column catalog.offers.availability_label is
  'Optional channel presentation only; inventory remains the authority for stock.';
