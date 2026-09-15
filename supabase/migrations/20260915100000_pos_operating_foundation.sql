-- REYON unified physical POS operating foundation.
-- Additive only: the canonical catalog, inventory ledger, orders, payments,
-- customers, returns, purchasing, and accounting systems remain authoritative.

insert into organization.channels(organization_id, code, display_name, kind_key)
select id, 'physical-pos', 'REYON Physical POS', 'point-of-sale'
from organization.organizations where code = 'reyon-online'
on conflict(organization_id, code) do update set
  display_name = excluded.display_name,
  kind_key = excluded.kind_key;

insert into organization.location_channels(location_id, channel_id)
select l.id, c.id
from organization.locations l
join organization.organizations o on o.id = l.organization_id and o.code = 'reyon-online'
join organization.channels c on c.organization_id = o.id and c.code = 'physical-pos'
on conflict do nothing;

create table access.capability_definitions(
  capability_key text primary key,
  display_name text not null,
  constraint capability_key_format check(capability_key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  constraint capability_name_present check(btrim(display_name) <> '')
);

insert into access.capability_definitions(capability_key, display_name) values
  ('pos.access', 'Access POS'),
  ('pos.checkout', 'Complete POS sales'),
  ('pos.refund', 'Return or refund POS sales'),
  ('pos.open_shift', 'Open register shifts'),
  ('pos.close_shift', 'Close register shifts'),
  ('pos.cash_event', 'Record register cash events'),
  ('pos.record_due', 'Record sales with an outstanding balance'),
  ('inventory.view', 'View inventory'),
  ('inventory.adjust', 'Adjust inventory'),
  ('catalog.manage', 'Manage products and catalog'),
  ('purchasing.manage', 'Manage suppliers and purchasing'),
  ('customers.manage', 'Manage customers'),
  ('staff.manage', 'Manage staff access'),
  ('settings.manage', 'Manage POS settings'),
  ('reports.financial', 'View financial reports');

create table access.role_capabilities(
  role_key text not null,
  capability_key text not null references access.capability_definitions(capability_key) on delete restrict,
  primary key(role_key, capability_key),
  constraint role_capability_role_approved check(role_key in ('super-admin','admin','staff'))
);

insert into access.role_capabilities(role_key, capability_key)
select 'super-admin', capability_key from access.capability_definitions
union all
select 'admin', capability_key from access.capability_definitions
union all
select 'staff', capability_key from access.capability_definitions
where capability_key in (
  'pos.access','pos.checkout','pos.open_shift','pos.close_shift','pos.cash_event',
  'inventory.view','customers.manage'
);

create table access.member_capability_overrides(
  user_id uuid not null references auth.users(id) on delete cascade,
  capability_key text not null references access.capability_definitions(capability_key) on delete restrict,
  is_granted boolean not null,
  changed_at timestamptz not null default statement_timestamp(),
  changed_by uuid references auth.users(id) on delete restrict,
  primary key(user_id, capability_key)
);

create table access.member_location_assignments(
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references organization.locations(id) on delete restrict,
  assigned_at timestamptz not null default statement_timestamp(),
  assigned_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  primary key(user_id, location_id),
  constraint member_location_revocation_valid check(revoked_at is null or revoked_at >= assigned_at)
);

insert into access.member_location_assignments(user_id, location_id)
select m.user_id, l.id
from access.admin_memberships m
cross join organization.locations l
join organization.organizations o on o.id = l.organization_id and o.code = 'reyon-online'
where m.revoked_at is null and l.code = 'main-inventory'
on conflict do nothing;

create or replace function access.assign_default_location()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.revoked_at is null then
    insert into access.member_location_assignments(user_id,location_id,assigned_by)
    select new.user_id,l.id,new.granted_by from organization.locations l
    join organization.organizations o on o.id=l.organization_id
    where o.code='reyon-online' and l.code='main-inventory'
    on conflict(user_id,location_id)do update set revoked_at=null;
  end if;
  return new;
end;
$$;
create trigger admin_membership_assign_default_location
after insert on access.admin_memberships for each row execute function access.assign_default_location();

alter table access.capability_definitions enable row level security;
alter table access.role_capabilities enable row level security;
alter table access.member_capability_overrides enable row level security;
alter table access.member_location_assignments enable row level security;
revoke all on access.capability_definitions, access.role_capabilities,
  access.member_capability_overrides, access.member_location_assignments
  from public, anon, authenticated;
grant all on access.capability_definitions, access.role_capabilities,
  access.member_capability_overrides, access.member_location_assignments to service_role;

create or replace function access.has_capability(p_capability text, p_location_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1
    from access.admin_memberships m
    where m.user_id = auth.uid() and m.revoked_at is null
      and coalesce(
        (select o.is_granted from access.member_capability_overrides o
         where o.user_id = m.user_id and o.capability_key = p_capability),
        exists(select 1 from access.role_capabilities rc
          where rc.role_key = m.role_key and rc.capability_key = p_capability),
        false
      )
      and (p_location_id is null or exists(
        select 1 from access.member_location_assignments a
        where a.user_id = m.user_id and a.location_id = p_location_id and a.revoked_at is null
      ))
  );
$$;
revoke all on function access.has_capability(text, uuid) from public, anon, authenticated;

create schema if not exists pos;
revoke all on schema pos from public, anon, authenticated;
grant usage on schema pos to service_role;

create table pos.registers(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  location_id uuid not null references organization.locations(id) on delete restrict,
  code text not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint register_code_format check(code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint register_name_present check(btrim(display_name) <> ''),
  constraint register_location_code_unique unique(location_id, code)
);

insert into pos.registers(organization_id, location_id, code, display_name)
select o.id, l.id, 'main-register', 'Main Register'
from organization.organizations o
join organization.locations l on l.organization_id = o.id and l.code = 'main-inventory'
where o.code = 'reyon-online'
on conflict(location_id, code) do update set display_name = excluded.display_name;

create table pos.shifts(
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references pos.registers(id) on delete restrict,
  location_id uuid not null references organization.locations(id) on delete restrict,
  operator_id uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz not null default statement_timestamp(),
  opening_cash numeric(18,2) not null,
  closed_at timestamptz,
  closing_cash numeric(18,2),
  expected_cash numeric(18,2),
  variance_amount numeric(18,2),
  close_note text,
  constraint shift_cash_nonnegative check(opening_cash >= 0 and (closing_cash is null or closing_cash >= 0)),
  constraint shift_close_consistent check(
    (closed_at is null and closing_cash is null and expected_cash is null and variance_amount is null)
    or (closed_at is not null and closing_cash is not null and expected_cash is not null and variance_amount is not null)
  )
);
create unique index one_open_shift_per_register on pos.shifts(register_id) where closed_at is null;
create index shifts_operator_opened_idx on pos.shifts(operator_id, opened_at desc);

create table pos.cash_events(
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references pos.shifts(id) on delete restrict,
  event_type_key text not null check(event_type_key in ('cash-in','cash-out')),
  amount numeric(18,2) not null check(amount > 0),
  reason text not null check(btrim(reason) <> ''),
  occurred_at timestamptz not null default statement_timestamp(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null unique check(btrim(idempotency_key) <> '')
);

create table pos.sale_details(
  order_id uuid primary key references sales.orders(id) on delete restrict,
  register_id uuid not null references pos.registers(id) on delete restrict,
  shift_id uuid not null references pos.shifts(id) on delete restrict,
  location_id uuid not null references organization.locations(id) on delete restrict,
  operator_id uuid not null references auth.users(id) on delete restrict,
  operator_label text not null,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  notes text,
  tax_rate numeric(7,4) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  tendered_amount numeric(18,2) not null,
  change_amount numeric(18,2) not null default 0,
  due_amount numeric(18,2) not null default 0,
  payment_status_key text not null check(payment_status_key in ('paid','partial','due')),
  idempotency_key text not null unique,
  created_at timestamptz not null default statement_timestamp(),
  constraint pos_sale_amounts_nonnegative check(
    tax_rate >= 0 and tax_amount >= 0 and tendered_amount >= 0 and change_amount >= 0 and due_amount >= 0
  )
);

create table pos.tenders(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  payment_id uuid references payments.payment_records(id) on delete restrict,
  line_number integer not null check(line_number > 0),
  method_key text not null check(method_key in ('cash','card','mobile','bank-transfer')),
  method_name_snapshot text not null,
  tendered_amount numeric(18,2) not null check(tendered_amount > 0),
  applied_amount numeric(18,2) not null check(applied_amount >= 0 and applied_amount <= tendered_amount),
  transaction_reference text,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint tender_order_line_unique unique(order_id, line_number)
);

create table pos.receipt_settings(
  location_id uuid primary key references organization.locations(id) on delete restrict,
  business_name text not null default 'REYON',
  address text,
  phone text,
  logo_url text,
  currency_symbol text not null default '৳',
  tax_rate numeric(7,4) not null default 0 check(tax_rate >= 0),
  receipt_size text not null default '80mm' check(receipt_size in ('58mm','80mm','a4')),
  footer text,
  return_policy text,
  updated_at timestamptz not null default statement_timestamp(),
  updated_by uuid references auth.users(id) on delete restrict
);

insert into pos.receipt_settings(location_id, business_name, footer)
select l.id, 'REYON', 'Thank you for shopping with REYON.'
from organization.locations l join organization.organizations o on o.id=l.organization_id
where o.code='reyon-online' and l.code='main-inventory'
on conflict(location_id) do nothing;

create table pos.migration_staging_batches(
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_export_reference text not null,
  status_key text not null default 'pending' check(status_key in ('pending','validated','reconciled','rejected')),
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users(id) on delete restrict,
  unique(source_system, source_export_reference)
);

create table pos.migration_identity_mappings(
  batch_id uuid not null references pos.migration_staging_batches(id) on delete restrict,
  entity_kind text not null,
  source_id text not null,
  canonical_id uuid,
  resolution_key text not null default 'unresolved' check(resolution_key in ('unresolved','matched','created','rejected')),
  primary key(batch_id, entity_kind, source_id)
);

create table pos.catalog_imports(
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references organization.locations(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null unique check(btrim(idempotency_key) <> ''),
  request_rows jsonb not null check(jsonb_typeof(request_rows) = 'array'),
  product_ids uuid[] not null,
  created_at timestamptz not null default statement_timestamp()
);

create trigger registers_set_updated_at before update on pos.registers
for each row execute function organization.set_updated_at();
create trigger receipt_settings_set_updated_at before update on pos.receipt_settings
for each row execute function organization.set_updated_at();
create trigger cash_events_immutable before update or delete on pos.cash_events
for each row execute function sales.prevent_transition_mutation();
create trigger pos_sale_details_immutable before update or delete on pos.sale_details
for each row execute function sales.prevent_transition_mutation();
create trigger pos_tenders_immutable before update or delete on pos.tenders
for each row execute function payments.prevent_evidence_mutation();

alter table pos.registers enable row level security;
alter table pos.shifts enable row level security;
alter table pos.cash_events enable row level security;
alter table pos.sale_details enable row level security;
alter table pos.tenders enable row level security;
alter table pos.receipt_settings enable row level security;
alter table pos.migration_staging_batches enable row level security;
alter table pos.migration_identity_mappings enable row level security;
alter table pos.catalog_imports enable row level security;
revoke all on all tables in schema pos from public, anon, authenticated;
grant all on all tables in schema pos to service_role;

create or replace function public.pos_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is not null then jsonb_build_object(
    'userId', auth.uid(),
    'email', auth.jwt()->>'email',
    'role', public.reyon_admin_role(),
    'locations', coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'name', l.display_name, 'code', l.code,
      'registers', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.display_name,'code',r.code) order by r.display_name)
        from pos.registers r where r.location_id=l.id and r.is_active), '[]'::jsonb)
    ) order by l.display_name)
    from access.member_location_assignments a
    join organization.locations l on l.id=a.location_id
    where a.user_id=auth.uid() and a.revoked_at is null and access.has_capability('pos.access',l.id)), '[]'::jsonb),
    'capabilities', coalesce((select jsonb_agg(c.capability_key order by c.capability_key)
      from access.capability_definitions c where access.has_capability(c.capability_key,null)), '[]'::jsonb)
  ) end;
$$;

create or replace function public.pos_catalog(p_location_id uuid, p_query text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when access.has_capability('inventory.view',p_location_id) then coalesce(jsonb_agg(item order by product_name, variant_label), '[]'::jsonb) end
  from (
    select jsonb_build_object(
      'id',v.id,'productId',p.id,'name',p.name,'variantLabel',v.label,'sku',v.sku,'barcode',v.barcode,
      'category',c.name,'price',coalesce(pos_offer.price_amount,web_offer.price_amount),
      'compareAtPrice',coalesce(pos_offer.compare_at_amount,web_offer.compare_at_amount),
      'stock',coalesce(sp.available,0),'onHand',coalesce(sp.on_hand,0),'reserved',coalesce(sp.reserved,0),
      'imageUrl',media.storage_path
    ) item, p.name product_name, v.label variant_label
    from catalog.variants v
    join catalog.products p on p.id=v.product_id and p.status='published'
    left join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary
    left join catalog.categories c on c.id=pc.category_id
    left join catalog.offers pos_offer on pos_offer.variant_id=v.id and pos_offer.channel_key='physical-pos' and pos_offer.currency_code='BDT'
    left join catalog.offers web_offer on web_offer.variant_id=v.id and web_offer.channel_key='website' and web_offer.currency_code='BDT'
    left join inventory.stock_items si on si.catalog_variant_id=v.id
    left join inventory.stock_position sp on sp.stock_item_id=si.id and sp.location_id=p_location_id
    left join lateral(select storage_path from catalog.product_media m where m.product_id=p.id order by m.is_primary desc,m.display_order,m.id limit 1) media on true
    where coalesce(pos_offer.price_amount,web_offer.price_amount) is not null
      and (nullif(btrim(p_query),'') is null or p.name ilike '%'||btrim(p_query)||'%'
        or v.sku ilike '%'||btrim(p_query)||'%' or v.barcode ilike '%'||btrim(p_query)||'%'
        or c.name ilike '%'||btrim(p_query)||'%')
  ) catalog_rows;
$$;

create or replace function public.pos_open_shift(p_register_id uuid, p_opening_cash numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r pos.registers%rowtype; new_id uuid;
begin
  if not access.has_capability('pos.open_shift',null) then raise exception 'POS open-shift permission required.'; end if;
  select * into r from pos.registers where id=p_register_id and is_active for update;
  if r.id is null then raise exception 'Active register not found.'; end if;
  if not access.has_capability('pos.open_shift',r.location_id) then raise exception 'POS open-shift permission required.'; end if;
  if p_opening_cash is null or p_opening_cash < 0 then raise exception 'Opening cash cannot be negative.'; end if;
  insert into pos.shifts(register_id,location_id,operator_id,opening_cash)
  values(r.id,r.location_id,auth.uid(),round(p_opening_cash,2)) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.pos_record_cash_event(p_shift_id uuid,p_event_type text,p_amount numeric,p_reason text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s pos.shifts%rowtype; event_id uuid;
begin
  select * into s from pos.shifts where id=p_shift_id and closed_at is null for update;
  if s.id is null then raise exception 'Open shift not found.'; end if;
  if not access.has_capability('pos.cash_event',s.location_id) then raise exception 'POS cash-event permission required.'; end if;
  if p_event_type not in ('cash-in','cash-out') or p_amount is null or p_amount<=0 or nullif(btrim(p_reason),'') is null then
    raise exception 'A valid cash event, positive amount, and reason are required.';
  end if;
  select id into event_id from pos.cash_events where idempotency_key=p_idempotency_key;
  if event_id is not null then return event_id; end if;
  insert into pos.cash_events(shift_id,event_type_key,amount,reason,actor_id,idempotency_key)
  values(s.id,p_event_type,round(p_amount,2),btrim(p_reason),auth.uid(),btrim(p_idempotency_key)) returning id into event_id;
  return event_id;
end;
$$;

create or replace function public.pos_close_shift(p_shift_id uuid,p_closing_cash numeric,p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s pos.shifts%rowtype; expected numeric(18,2); cash_sales numeric(18,2); cash_events numeric(18,2);
begin
  select * into s from pos.shifts where id=p_shift_id and closed_at is null for update;
  if s.id is null then raise exception 'Open shift not found.'; end if;
  if not access.has_capability('pos.close_shift',s.location_id) then raise exception 'POS close-shift permission required.'; end if;
  if p_closing_cash is null or p_closing_cash<0 then raise exception 'Closing cash cannot be negative.'; end if;
  select coalesce(sum(t.applied_amount),0) into cash_sales from pos.tenders t join pos.sale_details d on d.order_id=t.order_id
    where d.shift_id=s.id and t.method_key='cash';
  select coalesce(sum(case when event_type_key='cash-in' then amount else -amount end),0) into cash_events from pos.cash_events where shift_id=s.id;
  expected:=round(s.opening_cash+cash_sales+cash_events,2);
  update pos.shifts set closed_at=statement_timestamp(),closing_cash=round(p_closing_cash,2),expected_cash=expected,
    variance_amount=round(p_closing_cash-expected,2),close_note=nullif(btrim(p_note),'') where id=s.id;
  return jsonb_build_object('shiftId',s.id,'expectedCash',expected,'closingCash',round(p_closing_cash,2),'variance',round(p_closing_cash-expected,2));
end;
$$;

create or replace function public.pos_checkout(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_idempotency text:=nullif(btrim(p_request->>'idempotencyKey'),'');
  v_location uuid:=(p_request->>'locationId')::uuid;
  v_register uuid:=(p_request->>'registerId')::uuid;
  v_shift uuid:=(p_request->>'shiftId')::uuid;
  v_org uuid; v_channel uuid; v_order uuid; v_existing uuid; v_transition uuid; v_movement uuid;
  v_customer uuid; v_payment_method uuid; v_payment uuid; v_invoice bigint; v_receipt bigint;
  v_gross numeric(18,2):=0; v_discount numeric(18,2):=0; v_tax numeric(18,2):=0; v_total numeric(18,2):=0;
  v_tendered numeric(18,2):=0; v_applied numeric(18,2):=0; v_remaining numeric(18,2):=0;
  v_discount_value numeric:=coalesce((p_request->>'discountValue')::numeric,0);
  v_tax_rate numeric:=coalesce((p_request->>'taxRate')::numeric,0);
  v_line integer:=0; v_tender_line integer:=0; item record; tender record; v_name text; v_phone text;
  v_status text; v_summary_method text; v_summary_kind text; v_summary_state text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if v_idempotency is null then raise exception 'Idempotency key is required.'; end if;
  select order_id into v_existing from pos.sale_details where idempotency_key=v_idempotency;
  if v_existing is not null then return public.pos_receipt(v_existing); end if;
  if not access.has_capability('pos.checkout',v_location) then raise exception 'POS checkout permission required.'; end if;
  if jsonb_typeof(p_request->'items')<>'array' or jsonb_array_length(p_request->'items')=0 then raise exception 'Cart is empty.'; end if;
  if jsonb_typeof(p_request->'tenders')<>'array' then raise exception 'Tender lines are required.'; end if;
  select o.id,c.id into v_org,v_channel from organization.organizations o join organization.channels c on c.organization_id=o.id and c.code='physical-pos' where o.code='reyon-online';
  if not exists(select 1 from pos.registers r where r.id=v_register and r.location_id=v_location and r.organization_id=v_org and r.is_active) then raise exception 'Register does not belong to the selected location.'; end if;
  if not exists(select 1 from pos.shifts s where s.id=v_shift and s.register_id=v_register and s.location_id=v_location and s.closed_at is null) then raise exception 'An open shift is required.'; end if;

  for item in
    select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid order by (x->>'variantId')::uuid
  loop
    if item.quantity<=0 or item.quantity<>trunc(item.quantity) then raise exception 'Sale quantity must be a positive whole number.'; end if;
    perform 1 from inventory.stock_items si where si.catalog_variant_id=item.variant_id for update;
    select item.variant_id variant_id,item.quantity quantity,p.name,v.label,v.sku,si.id stock_item_id,si.base_unit_code,
      coalesce(po.price_amount,wo.price_amount) price_amount,coalesce(sp.available,0) available
    into item from catalog.variants v join catalog.products p on p.id=v.product_id and p.status='published'
      join inventory.stock_items si on si.catalog_variant_id=v.id
      left join catalog.offers po on po.variant_id=v.id and po.channel_key='physical-pos' and po.currency_code='BDT'
      left join catalog.offers wo on wo.variant_id=v.id and wo.channel_key='website' and wo.currency_code='BDT'
      left join inventory.stock_position sp on sp.stock_item_id=si.id and sp.location_id=v_location
      where v.id=item.variant_id;
    if item.stock_item_id is null or item.price_amount is null then raise exception 'A cart product is not currently saleable.'; end if;
    if item.available<item.quantity then raise exception 'Insufficient stock for %. Requested %; available %.',item.name,item.quantity,greatest(floor(item.available),0); end if;
    v_gross:=v_gross+round(item.price_amount*item.quantity,2);
  end loop;
  v_discount:=case when upper(coalesce(p_request->>'discountType','FIXED'))='PERCENT' then round(v_gross*least(greatest(v_discount_value,0),100)/100,2) else least(greatest(round(v_discount_value,2),0),v_gross) end;
  v_tax:=round((v_gross-v_discount)*greatest(v_tax_rate,0)/100,2);
  v_total:=round(v_gross-v_discount+v_tax,2);
  select coalesce(sum((x->>'amount')::numeric),0) into v_tendered from jsonb_array_elements(p_request->'tenders') x where coalesce((x->>'amount')::numeric,0)>0;
  v_tendered:=round(v_tendered,2); v_remaining:=greatest(v_total-v_tendered,0);
  if v_remaining>0 and not access.has_capability('pos.record_due',v_location) then raise exception 'Full payment is required.'; end if;
  v_status:=case when v_remaining=0 then 'paid' when v_tendered>0 then 'partial' else 'due' end;

  v_name:=nullif(btrim(p_request->>'customerName'),''); v_phone:=nullif(btrim(p_request->>'customerPhone'),'');
  if v_phone is not null then
    select cc.customer_id into v_customer from crm.customer_contacts cc join crm.customers c on c.id=cc.customer_id
      where c.organization_id=v_org and cc.contact_kind='phone' and cc.normalized_value=regexp_replace(v_phone,'[^0-9]+','','g') limit 1;
    if v_customer is null then
      insert into crm.customers(organization_id) values(v_org) returning id into v_customer;
      insert into crm.customer_profiles(customer_id,full_name) values(v_customer,coalesce(v_name,'POS Customer'));
      insert into crm.customer_contacts(customer_id,contact_kind,contact_value,normalized_value) values(v_customer,'phone',v_phone,regexp_replace(v_phone,'[^0-9]+','','g'));
      insert into crm.external_identities(organization_id,customer_id,source_namespace,source_reference,idempotency_key)
      values(v_org,v_customer,'physical-pos',v_idempotency,'pos-customer:'||v_idempotency);
      insert into crm.customer_events(organization_id,customer_id,sequence_number,event_type_key,occurred_at,reason,rule_version,idempotency_key)
      values(v_org,v_customer,1,'profile-created',statement_timestamp(),'Created during authorized POS sale','pos-v1','pos-customer-profile:'||v_idempotency);
    end if;
  end if;

  v_order:=gen_random_uuid();
  insert into sales.orders(id,organization_id,channel_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,customer_id,current_state_key,subtotal_amount,delivery_amount,total_amount,gross_product_amount,discount_amount)
  values(v_order,v_org,v_channel,'BDT','physical-pos',v_idempotency,'pos-order:'||v_idempotency,statement_timestamp(),v_customer,'completed',v_total,0,v_total,v_gross+v_tax,v_discount);

  for item in
    select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid order by (x->>'variantId')::uuid
  loop
    select item.variant_id variant_id,item.quantity quantity,p.name,v.label,v.sku,si.id stock_item_id,si.base_unit_code,coalesce(po.price_amount,wo.price_amount) price_amount
    into item from catalog.variants v join catalog.products p on p.id=v.product_id join inventory.stock_items si on si.catalog_variant_id=v.id
      left join catalog.offers po on po.variant_id=v.id and po.channel_key='physical-pos' and po.currency_code='BDT'
      left join catalog.offers wo on wo.variant_id=v.id and wo.channel_key='website' and wo.currency_code='BDT' where v.id=item.variant_id;
    v_line:=v_line+1;
    insert into sales.order_lines(order_id,line_number,catalog_variant_id,sku_snapshot,product_name_snapshot,variant_label_snapshot,quantity,unit_price_amount)
    values(v_order,v_line,item.variant_id,item.sku,item.name,item.label,item.quantity,item.price_amount);
  end loop;
  insert into inventory.movements(movement_type_key,occurred_at,source_namespace,source_reference,idempotency_key,reason_key,actor_id,actor_label)
  values('sale',statement_timestamp(),'sales-order',(select external_reference from sales.orders where id=v_order),'pos-stock:'||v_idempotency,'pos-checkout',auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text)) returning id into v_movement;
  insert into inventory.movement_lines(movement_id,line_number,stock_item_id,location_id,quantity_delta,unit_code,condition_key)
  select v_movement,row_number()over(order by si.id),si.id,v_location,-q.quantity,si.base_unit_code,'sold'
  from (select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid)q
  join inventory.stock_items si on si.catalog_variant_id=q.variant_id;

  select id into v_payment_method from payments.checkout_methods where method_key='cod';
  v_summary_method:=case when jsonb_array_length(p_request->'tenders')>1 then 'Split payment' else initcap(replace(coalesce(p_request->'tenders'->0->>'method','cash'),'-',' ')) end;
  v_summary_kind:=case when v_status='paid' then 'cod' else 'cod' end;
  v_summary_state:='collected';
  insert into sales.order_payment_details(order_id,method_id,method_key_snapshot,method_name_snapshot,method_kind_snapshot,transaction_reference,evidence_state_key)
  values(v_order,v_payment_method,'pos-tender',v_summary_method,v_summary_kind,null,v_summary_state);

  v_remaining:=v_total;
  for tender in select x,row_number()over() line_no from jsonb_array_elements(p_request->'tenders')x where coalesce((x->>'amount')::numeric,0)>0
  loop
    v_tender_line:=v_tender_line+1; v_applied:=least(round((tender.x->>'amount')::numeric,2),v_remaining);
    if tender.x->>'method' not in ('cash','card','mobile','bank-transfer') then raise exception 'Unsupported tender method.'; end if;
    if tender.x->>'method'<>'cash' and nullif(btrim(tender.x->>'reference'),'') is null then raise exception 'A transaction reference is required for non-cash tenders.'; end if;
    if v_applied>0 then
      insert into payments.payment_records(organization_id,payment_kind_key,currency_code,amount,source_namespace,source_reference,idempotency_key,occurred_at,actor_id)
      values(v_org,tender.x->>'method','BDT',v_applied,'physical-pos',(select external_reference from sales.orders where id=v_order),'pos-payment:'||v_idempotency||':'||v_tender_line,statement_timestamp(),auth.uid()) returning id into v_payment;
      insert into payments.order_allocations(payment_id,order_id,amount,allocation_kind_key,occurred_at,idempotency_key)
      values(v_payment,v_order,v_applied,'sale',statement_timestamp(),'pos-allocation:'||v_idempotency||':'||v_tender_line);
      insert into payments.payment_events(payment_id,sequence_number,event_type_key,to_state_key,provider_namespace,provider_event_reference,occurred_at,actor_id,rule_version,idempotency_key)
      values(v_payment,1,'collected','collected',case when tender.x->>'method'='cash' then null else tender.x->>'method' end,
        case when tender.x->>'method'='cash' then null else btrim(tender.x->>'reference') end,statement_timestamp(),auth.uid(),'pos-v1','pos-payment-event:'||v_idempotency||':'||v_tender_line);
      insert into payments.receipts(order_id,source_event_type,source_event_id,payment_method_snapshot,amount,currency_code,issued_at)
      values(v_order,'pos-payment',v_payment,initcap(replace(tender.x->>'method','-',' ')),v_applied,'BDT',statement_timestamp());
    end if;
    insert into pos.tenders(order_id,payment_id,line_number,method_key,method_name_snapshot,tendered_amount,applied_amount,transaction_reference)
    values(v_order,v_payment,v_tender_line,tender.x->>'method',initcap(replace(tender.x->>'method','-',' ')),round((tender.x->>'amount')::numeric,2),v_applied,nullif(btrim(tender.x->>'reference'),''));
    v_remaining:=greatest(v_remaining-v_applied,0);
  end loop;
  insert into pos.sale_details(order_id,register_id,shift_id,location_id,operator_id,operator_label,customer_name_snapshot,customer_phone_snapshot,notes,tax_rate,tax_amount,tendered_amount,change_amount,due_amount,payment_status_key,idempotency_key)
  values(v_order,v_register,v_shift,v_location,auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text),v_name,v_phone,nullif(btrim(p_request->>'notes'),''),v_tax_rate,v_tax,v_tendered,greatest(v_tendered-v_total,0),greatest(v_total-v_tendered,0),v_status,v_idempotency);
  if v_customer is not null then insert into crm.order_associations(organization_id,customer_id,order_id,association_kind_key,occurred_at,actor_id,idempotency_key)
    values(v_org,v_customer,v_order,'customer',statement_timestamp(),auth.uid(),'pos-order-customer:'||v_idempotency); end if;
  insert into sales.order_transitions(id,order_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,reason_key,rule_version,idempotency_key)
  values(gen_random_uuid(),v_order,1,null,'completed',statement_timestamp(),auth.uid(),'pos-checkout','pos-v1','pos-complete:'||v_idempotency) returning id into v_transition;
  return public.pos_receipt(v_order);
exception when unique_violation then
  select order_id into v_existing from pos.sale_details where idempotency_key=v_idempotency;
  if v_existing is null then raise; end if;
  return public.pos_receipt(v_existing);
end;
$$;

create or replace function public.pos_receipt(p_order_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('pos.access',d.location_id) then jsonb_build_object(
  'orderId',o.id,'orderNumber',o.external_reference,'invoiceNumber',i.invoice_number,
  'receiptNumber',(select max(receipt_number) from payments.receipts where order_id=o.id),
  'occurredAt',o.occurred_at,'currency','BDT','gross',o.gross_product_amount-d.tax_amount,
  'discount',o.discount_amount,'taxRate',d.tax_rate,'tax',d.tax_amount,'total',o.total_amount,
  'paid',least(d.tendered_amount,o.total_amount),'tendered',d.tendered_amount,'change',d.change_amount,'due',d.due_amount,
  'paymentStatus',d.payment_status_key,'customerName',d.customer_name_snapshot,'customerPhone',d.customer_phone_snapshot,
  'cashier',d.operator_label,'notes',d.notes,'location',l.display_name,'register',r.display_name,
  'settings',to_jsonb(s),
  'items',(select coalesce(jsonb_agg(jsonb_build_object('name',ol.product_name_snapshot,'variant',ol.variant_label_snapshot,'sku',ol.sku_snapshot,'quantity',ol.quantity,'price',ol.unit_price_amount,'total',ol.quantity*ol.unit_price_amount)order by ol.line_number),'[]'::jsonb)from sales.order_lines ol where ol.order_id=o.id),
  'tenders',(select coalesce(jsonb_agg(jsonb_build_object('method',t.method_name_snapshot,'tendered',t.tendered_amount,'applied',t.applied_amount,'reference',t.transaction_reference)order by t.line_number),'[]'::jsonb)from pos.tenders t where t.order_id=o.id)
) end
from sales.orders o join pos.sale_details d on d.order_id=o.id join pos.registers r on r.id=d.register_id
join organization.locations l on l.id=d.location_id left join sales.invoices i on i.order_id=o.id
left join pos.receipt_settings s on s.location_id=d.location_id where o.id=p_order_id;
$$;

create or replace function public.pos_sales(p_location_id uuid,p_query text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('pos.access',p_location_id) then coalesce(jsonb_agg(jsonb_build_object(
  'orderId',o.id,'orderNumber',o.external_reference,'invoiceNumber',i.invoice_number,'occurredAt',o.occurred_at,
  'customer',coalesce(d.customer_name_snapshot,'Walk-in Customer'),'cashier',d.operator_label,'total',o.total_amount,
  'paid',least(d.tendered_amount,o.total_amount),'due',d.due_amount,'paymentStatus',d.payment_status_key
)order by o.occurred_at desc),'[]'::jsonb) end
from sales.orders o join pos.sale_details d on d.order_id=o.id left join sales.invoices i on i.order_id=o.id
where d.location_id=p_location_id and (nullif(btrim(p_query),'')is null or o.external_reference ilike '%'||btrim(p_query)||'%' or d.customer_name_snapshot ilike '%'||btrim(p_query)||'%' or d.customer_phone_snapshot ilike '%'||btrim(p_query)||'%');
$$;

create or replace function public.pos_dashboard(p_location_id uuid,p_from timestamptz default null,p_to timestamptz default null)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('reports.financial',p_location_id) then jsonb_build_object(
  'salesCount',count(*),'revenue',coalesce(sum(o.total_amount),0),'discounts',coalesce(sum(o.discount_amount),0),
  'tax',coalesce(sum(d.tax_amount),0),'due',coalesce(sum(d.due_amount),0),
  'returns',coalesce((select sum(rf.total_refund_amount) from payments.return_refunds rf
    join reverse_logistics.return_requests rr on rr.id=rf.return_request_id join pos.sale_details pd on pd.order_id=rr.order_id
    where pd.location_id=p_location_id and rf.status_key='refunded' and rf.executed_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and rf.executed_at<coalesce(p_to,statement_timestamp())),0),
  'tenders',coalesce((select jsonb_agg(jsonb_build_object('method',method_key,'amount',amount)order by method_key)from(
    select t.method_key,sum(t.applied_amount)amount from pos.tenders t join pos.sale_details x on x.order_id=t.order_id join sales.orders so on so.id=t.order_id
    where x.location_id=p_location_id and so.occurred_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and so.occurred_at<coalesce(p_to,statement_timestamp()) group by t.method_key
  )breakdown),'[]'::jsonb),
  'products',coalesce((select jsonb_agg(jsonb_build_object('name',name,'sku',sku,'quantity',quantity,'revenue',revenue)order by quantity desc,name)from(
    select ol.product_name_snapshot name,ol.sku_snapshot sku,sum(ol.quantity)quantity,sum(ol.quantity*ol.unit_price_amount)revenue
    from sales.order_lines ol join pos.sale_details pd on pd.order_id=ol.order_id join sales.orders so on so.id=ol.order_id
    where pd.location_id=p_location_id and so.occurred_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and so.occurred_at<coalesce(p_to,statement_timestamp())
    group by ol.product_name_snapshot,ol.sku_snapshot
  )product_breakdown),'[]'::jsonb),
  'cashiers',coalesce((select jsonb_agg(jsonb_build_object('cashier',cashier,'sales',sales,'revenue',revenue)order by revenue desc)from(
    select pd.operator_label cashier,count(*)sales,sum(so.total_amount)revenue from pos.sale_details pd join sales.orders so on so.id=pd.order_id
    where pd.location_id=p_location_id and so.occurred_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and so.occurred_at<coalesce(p_to,statement_timestamp()) group by pd.operator_label
  )cashier_breakdown),'[]'::jsonb),
  'channels',coalesce((select jsonb_agg(jsonb_build_object('channel',c.code,'sales',counted,'revenue',revenue)order by c.code)from(
    select ch.code,count(*)counted,sum(cs.grand_total_amount)revenue from sales.completed_sales cs join sales.orders so on so.id=cs.order_id join organization.channels ch on ch.id=so.channel_id
    where cs.completed_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and cs.completed_at<coalesce(p_to,statement_timestamp()) group by ch.code
  )c),'[]'::jsonb)
) end from sales.orders o join pos.sale_details d on d.order_id=o.id where d.location_id=p_location_id and o.occurred_at>=coalesce(p_from,date_trunc('day',statement_timestamp())) and o.occurred_at<coalesce(p_to,statement_timestamp());
$$;

create or replace function public.pos_shift_history(p_location_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('pos.access',p_location_id) then coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'registerId',s.register_id,'register',r.display_name,'operatorId',s.operator_id,'openedAt',s.opened_at,
  'openingCash',s.opening_cash,'closedAt',s.closed_at,'closingCash',s.closing_cash,'expectedCash',s.expected_cash,'variance',s.variance_amount,
  'sales',coalesce((select sum(o.total_amount)from pos.sale_details d join sales.orders o on o.id=d.order_id where d.shift_id=s.id),0)
)order by s.opened_at desc),'[]'::jsonb) end from pos.shifts s join pos.registers r on r.id=s.register_id where s.location_id=p_location_id;
$$;

create or replace function public.pos_customers(p_location_id uuid,p_query text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('customers.manage',p_location_id) then coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'name',p.full_name,'phone',ph.contact_value,'createdAt',c.created_at,
  'salesCount',(select count(*)from crm.order_associations a join pos.sale_details d on d.order_id=a.order_id where a.customer_id=c.id and d.location_id=p_location_id),
  'totalSpent',(select coalesce(sum(o.total_amount),0)from crm.order_associations a join pos.sale_details d on d.order_id=a.order_id join sales.orders o on o.id=a.order_id where a.customer_id=c.id and d.location_id=p_location_id)
)order by p.full_name),'[]'::jsonb) end from crm.customers c join crm.customer_profiles p on p.customer_id=c.id
left join crm.customer_contacts ph on ph.customer_id=c.id and ph.contact_kind='phone'
where nullif(btrim(p_query),'')is null or p.full_name ilike '%'||btrim(p_query)||'%' or ph.contact_value ilike '%'||btrim(p_query)||'%';
$$;

create or replace function public.pos_save_settings(p_location_id uuid,p_settings jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not access.has_capability('settings.manage',p_location_id) then raise exception 'POS settings permission required.'; end if;
  insert into pos.receipt_settings(location_id,business_name,address,phone,logo_url,currency_symbol,tax_rate,receipt_size,footer,return_policy,updated_by)
  values(p_location_id,coalesce(nullif(btrim(p_settings->>'businessName'),''),'REYON'),nullif(btrim(p_settings->>'address'),''),nullif(btrim(p_settings->>'phone'),''),nullif(btrim(p_settings->>'logoUrl'),''),coalesce(nullif(p_settings->>'currencySymbol',''),'৳'),greatest(coalesce((p_settings->>'taxRate')::numeric,0),0),coalesce(nullif(p_settings->>'receiptSize',''),'80mm'),nullif(btrim(p_settings->>'footer'),''),nullif(btrim(p_settings->>'returnPolicy'),''),auth.uid())
  on conflict(location_id)do update set business_name=excluded.business_name,address=excluded.address,phone=excluded.phone,logo_url=excluded.logo_url,currency_symbol=excluded.currency_symbol,tax_rate=excluded.tax_rate,receipt_size=excluded.receipt_size,footer=excluded.footer,return_policy=excluded.return_policy,updated_by=excluded.updated_by;
end;
$$;

create or replace function public.pos_settings(p_location_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('pos.access',p_location_id) then jsonb_build_object(
  'businessName',business_name,'address',address,'phone',phone,'logoUrl',logo_url,
  'currencySymbol',currency_symbol,'taxRate',tax_rate,'receiptSize',receipt_size,
  'footer',footer,'returnPolicy',return_policy
) end from pos.receipt_settings where location_id=p_location_id;
$$;

create or replace function public.pos_adjust_inventory(p_variant_id uuid,p_location_id uuid,p_movement_type text,p_quantity numeric,p_reason text,p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not access.has_capability('inventory.adjust',p_location_id) then raise exception 'Inventory adjustment permission required.'; end if;
  return public.admin_record_inventory_movement(p_variant_id,p_location_id,p_movement_type,p_quantity,p_reason,p_reference);
end;
$$;

create or replace function public.pos_staff(p_location_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('staff.manage',p_location_id) then coalesce(jsonb_agg(jsonb_build_object(
  'userId',m.user_id,'email',u.email,'role',m.role_key,'active',m.revoked_at is null,
  'assigned',exists(select 1 from access.member_location_assignments a where a.user_id=m.user_id and a.location_id=p_location_id and a.revoked_at is null),
  'capabilities',coalesce((select jsonb_agg(c.capability_key order by c.capability_key)from access.capability_definitions c
    where coalesce((select o.is_granted from access.member_capability_overrides o where o.user_id=m.user_id and o.capability_key=c.capability_key),
      exists(select 1 from access.role_capabilities rc where rc.role_key=m.role_key and rc.capability_key=c.capability_key),false)),'[]'::jsonb)
)order by u.email),'[]'::jsonb) end from access.admin_memberships m join auth.users u on u.id=m.user_id;
$$;

create or replace function public.pos_set_staff_access(p_user_id uuid,p_location_id uuid,p_role text,p_active boolean,p_capabilities jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare cap text;
begin
  if not access.has_capability('staff.manage',p_location_id) then raise exception 'Staff management permission required.'; end if;
  if public.reyon_admin_role()<>'super-admin' and p_role='super-admin' then raise exception 'Only a Super Admin can assign Super Admin.'; end if;
  if p_user_id=auth.uid() and not p_active then raise exception 'You cannot deactivate your own account.'; end if;
  if p_role not in('super-admin','admin','staff') then raise exception 'Unsupported staff role.'; end if;
  insert into access.admin_memberships(user_id,role_key,granted_by,revoked_at,revocation_reason)
  values(p_user_id,p_role,auth.uid(),case when p_active then null else statement_timestamp() end,case when p_active then null else 'Deactivated by staff manager' end)
  on conflict(user_id)do update set role_key=excluded.role_key,revoked_at=excluded.revoked_at,revocation_reason=excluded.revocation_reason;
  insert into access.member_location_assignments(user_id,location_id,assigned_by,revoked_at)
  values(p_user_id,p_location_id,auth.uid(),case when p_active then null else statement_timestamp() end)
  on conflict(user_id,location_id)do update set revoked_at=excluded.revoked_at,assigned_by=auth.uid(),assigned_at=statement_timestamp();
  delete from access.member_capability_overrides where user_id=p_user_id;
  if jsonb_typeof(p_capabilities)='array' then
    for cap in select jsonb_array_elements_text(p_capabilities) loop
      if exists(select 1 from access.capability_definitions where capability_key=cap) then
        insert into access.member_capability_overrides(user_id,capability_key,is_granted,changed_by)values(p_user_id,cap,true,auth.uid());
      end if;
    end loop;
    insert into access.member_capability_overrides(user_id,capability_key,is_granted,changed_by)
    select p_user_id,c.capability_key,false,auth.uid() from access.capability_definitions c
    where not(p_capabilities ? c.capability_key) on conflict(user_id,capability_key)do nothing;
  end if;
end;
$$;

create or replace function public.pos_bulk_import_products(p_location_id uuid,p_idempotency_key text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing pos.catalog_imports%rowtype; row_data jsonb; created_id uuid; created_ids uuid[] := '{}';
begin
  if auth.uid() is null or not access.has_capability('catalog.manage',p_location_id) then
    raise exception 'Catalog management permission required.';
  end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception 'Import idempotency key is required.'; end if;
  select * into existing from pos.catalog_imports where idempotency_key=p_idempotency_key for update;
  if existing.id is not null then
    if existing.location_id<>p_location_id or existing.request_rows<>p_rows then raise exception 'Import idempotency key was reused with different input.'; end if;
    return jsonb_build_object('productIds',to_jsonb(existing.product_ids),'imported',cardinality(existing.product_ids));
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>100 then
    raise exception 'Import must contain between 1 and 100 products.';
  end if;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    created_id:=public.admin_create_watch(row_data);
    created_ids:=array_append(created_ids,created_id);
  end loop;
  insert into pos.catalog_imports(location_id,actor_id,idempotency_key,request_rows,product_ids)
  values(p_location_id,auth.uid(),p_idempotency_key,p_rows,created_ids);
  return jsonb_build_object('productIds',to_jsonb(created_ids),'imported',cardinality(created_ids));
end;
$$;

revoke all on function public.pos_context() from public, anon;
revoke all on function public.pos_catalog(uuid,text) from public, anon;
revoke all on function public.pos_open_shift(uuid,numeric) from public, anon;
revoke all on function public.pos_record_cash_event(uuid,text,numeric,text,text) from public, anon;
revoke all on function public.pos_close_shift(uuid,numeric,text) from public, anon;
revoke all on function public.pos_checkout(jsonb) from public, anon;
revoke all on function public.pos_receipt(uuid) from public, anon;
revoke all on function public.pos_sales(uuid,text) from public, anon;
revoke all on function public.pos_dashboard(uuid,timestamptz,timestamptz) from public, anon;
revoke all on function public.pos_shift_history(uuid) from public, anon;
revoke all on function public.pos_customers(uuid,text) from public, anon;
revoke all on function public.pos_save_settings(uuid,jsonb) from public, anon;
revoke all on function public.pos_settings(uuid) from public, anon;
revoke all on function public.pos_adjust_inventory(uuid,uuid,text,numeric,text,text) from public, anon;
revoke all on function public.pos_staff(uuid) from public, anon;
revoke all on function public.pos_set_staff_access(uuid,uuid,text,boolean,jsonb) from public, anon;
revoke all on function public.pos_bulk_import_products(uuid,text,jsonb) from public, anon;
grant execute on function public.pos_context(),public.pos_catalog(uuid,text),public.pos_open_shift(uuid,numeric),
  public.pos_record_cash_event(uuid,text,numeric,text,text),public.pos_close_shift(uuid,numeric,text),
  public.pos_checkout(jsonb),public.pos_receipt(uuid),public.pos_sales(uuid,text),
  public.pos_dashboard(uuid,timestamptz,timestamptz),public.pos_shift_history(uuid),
  public.pos_customers(uuid,text),public.pos_save_settings(uuid,jsonb),public.pos_settings(uuid),
  public.pos_adjust_inventory(uuid,uuid,text,numeric,text,text),public.pos_staff(uuid),
  public.pos_set_staff_access(uuid,uuid,text,boolean,jsonb),
  public.pos_bulk_import_products(uuid,text,jsonb) to authenticated;

comment on schema pos is 'Physical POS operating evidence layered over REYON canonical business domains.';
comment on function public.pos_checkout(jsonb) is 'Authorized, idempotent, transactional physical-POS checkout using canonical catalog prices, inventory ledger, orders, payments, invoices, and accounting triggers.';
comment on table pos.migration_staging_batches is 'Empty reconciliation staging for a separately approved future import; no Autopilot production data is migrated here.';

notify pgrst, 'reload schema';
