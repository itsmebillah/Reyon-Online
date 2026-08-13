-- Sprint 20: governed supplier lifecycle and variant sourcing relationships.

alter table purchasing.suppliers
  add column status_key text not null default 'draft',
  add constraint suppliers_status_approved
    check (status_key in ('draft','active','suspended','archived'));

create table purchasing.supplier_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references purchasing.suppliers(id) on delete restrict,
  sequence_number integer not null,
  from_state_key text,
  to_state_key text not null,
  reason text,
  actor_id uuid not null,
  actor_role text not null,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint supplier_lifecycle_sequence_positive check (sequence_number > 0),
  constraint supplier_lifecycle_states check (
    to_state_key in ('draft','active','suspended','archived') and
    (from_state_key is null or from_state_key in ('draft','active','suspended','archived'))
  ),
  constraint supplier_lifecycle_reason_present check (reason is null or btrim(reason) <> ''),
  constraint supplier_lifecycle_unique_sequence unique (supplier_id, sequence_number)
);

create table purchasing.supplier_variant_relationships (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references purchasing.suppliers(id) on delete restrict,
  catalog_variant_id uuid not null references catalog.variants(id) on delete restrict,
  supplier_sku text not null,
  minimum_order_quantity numeric(20,6) not null,
  pack_size numeric(20,6) not null,
  purchase_cost_amount numeric(18,2) not null,
  currency_code text not null default 'BDT',
  lead_time_days integer not null,
  is_preferred boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint supplier_variant_sku_present check (btrim(supplier_sku) <> ''),
  constraint supplier_variant_moq_positive check (minimum_order_quantity > 0),
  constraint supplier_variant_pack_positive check (pack_size > 0),
  constraint supplier_variant_cost_nonnegative check (purchase_cost_amount >= 0),
  constraint supplier_variant_currency_bdt check (currency_code = 'BDT'),
  constraint supplier_variant_lead_nonnegative check (lead_time_days >= 0),
  constraint supplier_variant_unique unique (supplier_id, catalog_variant_id)
);

create unique index supplier_variant_one_preferred
  on purchasing.supplier_variant_relationships(catalog_variant_id)
  where is_preferred and is_active;
create index supplier_lifecycle_events_supplier_idx
  on purchasing.supplier_lifecycle_events(supplier_id, sequence_number);
create index supplier_variant_supplier_idx
  on purchasing.supplier_variant_relationships(supplier_id);
create index supplier_variant_catalog_idx
  on purchasing.supplier_variant_relationships(catalog_variant_id);

create trigger supplier_lifecycle_events_immutable before update or delete
  on purchasing.supplier_lifecycle_events for each row
  execute function purchasing.prevent_transition_mutation();
create trigger supplier_variant_set_updated_at before update
  on purchasing.supplier_variant_relationships for each row
  execute function purchasing.set_updated_at();

alter table purchasing.supplier_lifecycle_events enable row level security;
alter table purchasing.supplier_variant_relationships enable row level security;
revoke all on purchasing.supplier_lifecycle_events, purchasing.supplier_variant_relationships
  from public, anon, authenticated;
grant all on purchasing.supplier_lifecycle_events, purchasing.supplier_variant_relationships to service_role;

create or replace function public.admin_supplier_management()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if public.reyon_admin_role() is null then raise exception 'Administrator access required.'; end if;
  return jsonb_build_object(
    'suppliers', coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'code',s.code,'displayName',s.display_name,'legalName',s.legal_name,
      'status',s.status_key,'createdAt',s.created_at,'updatedAt',s.updated_at,
      'relationships',coalesce((select jsonb_agg(jsonb_build_object(
        'id',r.id,'variantId',r.catalog_variant_id,'productName',p.name,'variantLabel',v.label,
        'sku',v.sku,'supplierSku',r.supplier_sku,'minimumOrderQuantity',r.minimum_order_quantity,
        'packSize',r.pack_size,'purchaseCost',r.purchase_cost_amount,'currency',r.currency_code,
        'leadTimeDays',r.lead_time_days,'isPreferred',r.is_preferred,'isActive',r.is_active
      ) order by p.name,v.label) from purchasing.supplier_variant_relationships r
        join catalog.variants v on v.id=r.catalog_variant_id join catalog.products p on p.id=v.product_id
        where r.supplier_id=s.id),'[]'::jsonb)
    ) order by s.display_name) from purchasing.suppliers s
      join organization.organizations o on o.id=s.organization_id where o.code='reyon-online'),'[]'::jsonb),
    'variants', coalesce((select jsonb_agg(jsonb_build_object(
      'id',v.id,'sku',v.sku,'label',v.label,'productName',p.name
    ) order by p.name,v.label) from catalog.variants v join catalog.products p on p.id=v.product_id),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_create_supplier(p_code text,p_display_name text,p_legal_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare role_key text; supplier_id uuid; org_id uuid;
begin
  role_key:=public.reyon_admin_role();
  if role_key is null then raise exception 'Administrator access required.'; end if;
  if nullif(btrim(p_display_name),'') is null then raise exception 'Supplier name is required.'; end if;
  select id into org_id from organization.organizations where code='reyon-online';
  insert into purchasing.suppliers(organization_id,code,display_name,legal_name,source_namespace,source_reference)
  values(org_id,lower(btrim(p_code)),btrim(p_display_name),nullif(btrim(p_legal_name),''),'admin-supplier',gen_random_uuid()::text)
  returning id into supplier_id;
  insert into purchasing.supplier_lifecycle_events(supplier_id,sequence_number,to_state_key,actor_id,actor_role)
  values(supplier_id,1,'draft',auth.uid(),role_key);
  return supplier_id;
end $$;

create or replace function public.admin_transition_supplier(p_supplier_id uuid,p_to_state text,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare role_key text; current_state text; next_sequence integer;
begin
  role_key:=public.reyon_admin_role();
  if role_key not in ('super-admin','admin') then raise exception 'Admin supplier permission required.'; end if;
  select status_key into current_state from purchasing.suppliers where id=p_supplier_id for update;
  if current_state is null then raise exception 'Supplier not found.'; end if;
  if not ((current_state='draft' and p_to_state='active') or
          (current_state='active' and p_to_state='suspended') or
          (current_state='suspended' and p_to_state='archived')) then
    raise exception 'Supplier lifecycle transition is not allowed.';
  end if;
  if p_to_state in ('suspended','archived') and nullif(btrim(p_reason),'') is null then
    raise exception 'A reason is required.';
  end if;
  select coalesce(max(sequence_number),0)+1 into next_sequence
  from purchasing.supplier_lifecycle_events where supplier_id=p_supplier_id;
  update purchasing.suppliers set status_key=p_to_state where id=p_supplier_id;
  insert into purchasing.supplier_lifecycle_events
    (supplier_id,sequence_number,from_state_key,to_state_key,reason,actor_id,actor_role)
  values(p_supplier_id,next_sequence,current_state,p_to_state,nullif(btrim(p_reason),''),auth.uid(),role_key);
end $$;

create or replace function public.admin_upsert_supplier_variant(
  p_supplier_id uuid,p_variant_id uuid,p_supplier_sku text,p_moq numeric,p_pack_size numeric,
  p_purchase_cost numeric,p_lead_time_days integer,p_is_preferred boolean,p_is_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare role_key text; relationship_id uuid; supplier_state text;
begin
  role_key:=public.reyon_admin_role();
  if role_key not in ('super-admin','admin') then raise exception 'Admin supplier permission required.'; end if;
  select status_key into supplier_state from purchasing.suppliers where id=p_supplier_id;
  if supplier_state <> 'active' then raise exception 'Only active suppliers can receive sourcing relationships.'; end if;
  if p_is_preferred then
    update purchasing.supplier_variant_relationships set is_preferred=false
    where catalog_variant_id=p_variant_id and supplier_id<>p_supplier_id and is_preferred;
  end if;
  insert into purchasing.supplier_variant_relationships
    (supplier_id,catalog_variant_id,supplier_sku,minimum_order_quantity,pack_size,purchase_cost_amount,lead_time_days,is_preferred,is_active)
  values(p_supplier_id,p_variant_id,btrim(p_supplier_sku),p_moq,p_pack_size,p_purchase_cost,p_lead_time_days,p_is_preferred,p_is_active)
  on conflict(supplier_id,catalog_variant_id) do update set supplier_sku=excluded.supplier_sku,
    minimum_order_quantity=excluded.minimum_order_quantity,pack_size=excluded.pack_size,
    purchase_cost_amount=excluded.purchase_cost_amount,lead_time_days=excluded.lead_time_days,
    is_preferred=excluded.is_preferred,is_active=excluded.is_active
  returning id into relationship_id;
  return relationship_id;
end $$;

revoke all on function public.admin_supplier_management() from public,anon;
revoke all on function public.admin_create_supplier(text,text,text) from public,anon;
revoke all on function public.admin_transition_supplier(uuid,text,text) from public,anon;
revoke all on function public.admin_upsert_supplier_variant(uuid,uuid,text,numeric,numeric,numeric,integer,boolean,boolean) from public,anon;
grant execute on function public.admin_supplier_management() to authenticated;
grant execute on function public.admin_create_supplier(text,text,text) to authenticated;
grant execute on function public.admin_transition_supplier(uuid,text,text) to authenticated;
grant execute on function public.admin_upsert_supplier_variant(uuid,uuid,text,numeric,numeric,numeric,integer,boolean,boolean) to authenticated;

comment on table purchasing.supplier_variant_relationships is
  'Approved supplier-to-variant sourcing terms in BDT; one active preferred supplier per variant.';
