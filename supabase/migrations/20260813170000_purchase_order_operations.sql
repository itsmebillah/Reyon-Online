-- Sprint 20: Purchase Order Operations. PO commands never post inventory.

create sequence purchasing.purchase_order_reference_sequence;

select setval('purchasing.purchase_order_reference_sequence',
  coalesce((select max(substring(external_reference from '([0-9]{6})$')::bigint)
    from purchasing.purchase_orders where external_reference ~ '^PO-[0-9]{4}-[0-9]{6}$'),1),
  exists(select 1 from purchasing.purchase_orders where external_reference ~ '^PO-[0-9]{4}-[0-9]{6}$'));

alter table purchasing.purchase_orders
  add column status_key text not null default 'draft',
  add column created_by uuid,
  add column approved_by uuid,
  add column approved_at timestamptz,
  add column is_emergency boolean not null default false,
  add column order_discount_type text,
  add column order_discount_value numeric(18,2) not null default 0,
  add column amendment_number integer not null default 0,
  add constraint purchase_orders_status_approved check(status_key in
    ('draft','pending-approval','approved','ordered','partially-received','fully-received','closed','cancelled','rejected')),
  add constraint purchase_orders_currency_bdt check(currency_code='BDT'),
  add constraint purchase_orders_discount_type check(order_discount_type is null or order_discount_type in('fixed','percentage')),
  add constraint purchase_orders_discount_nonnegative check(order_discount_value>=0),
  add constraint purchase_orders_amendment_nonnegative check(amendment_number>=0);

alter table purchasing.purchase_order_lines
  add column supplier_relationship_id uuid references purchasing.supplier_variant_relationships(id) on delete restrict,
  add column order_unit_key text not null default 'unit',
  add column pack_size_snapshot numeric(20,6) not null default 1,
  add column ordered_pack_count numeric(20,6),
  add column discount_type text,
  add column discount_value numeric(18,2) not null default 0,
  add constraint purchase_order_lines_unit_approved check(order_unit_key in('unit','pack')),
  add constraint purchase_order_lines_pack_positive check(pack_size_snapshot>0),
  add constraint purchase_order_lines_pack_count_positive check(ordered_pack_count is null or ordered_pack_count>0),
  add constraint purchase_order_lines_pack_consistent check(
    (order_unit_key='unit' and ordered_pack_count is null) or
    (order_unit_key='pack' and ordered_pack_count is not null and ordered_pack_count=trunc(ordered_pack_count))
  ),
  add constraint purchase_order_lines_discount_type check(discount_type is null or discount_type in('fixed','percentage')),
  add constraint purchase_order_lines_discount_nonnegative check(discount_value>=0),
  add constraint purchase_order_lines_order_variant_unique unique(purchase_order_id,catalog_variant_id);

alter table purchasing.purchase_transitions
  add column actor_role text;

create unique index purchase_orders_reference_unique on purchasing.purchase_orders(external_reference);

create or replace function purchasing.assign_purchase_order_reference()
returns trigger language plpgsql set search_path='' as $$
declare n bigint;
begin
  if tg_op='UPDATE' and old.external_reference is distinct from new.external_reference then
    raise exception 'Purchase order reference is immutable.';
  end if;
  if new.external_reference is null then
    n:=nextval('purchasing.purchase_order_reference_sequence');
    new.external_reference:='PO-'||extract(year from statement_timestamp() at time zone 'Asia/Dhaka')::integer||'-'||lpad(n::text,6,'0');
  end if;
  return new;
end $$;
create trigger purchase_orders_assign_reference before insert or update of external_reference
  on purchasing.purchase_orders for each row execute function purchasing.assign_purchase_order_reference();

update purchasing.purchase_orders set external_reference=null where external_reference is null;

create or replace function purchasing.po_line_net(p purchasing.purchase_order_lines)
returns numeric language sql immutable set search_path='' as $$
  select greatest(0,round((p.quantity*p.unit_cost_amount)-case
    when p.discount_type='percentage' then (p.quantity*p.unit_cost_amount)*(p.discount_value/100)
    when p.discount_type='fixed' then p.discount_value else 0 end,2));
$$;

create or replace function purchasing.po_totals(p_order_id uuid)
returns jsonb language sql stable set search_path='' as $$
  with x as(select coalesce(sum(l.quantity*l.unit_cost_amount),0)::numeric subtotal,
    coalesce(sum((l.quantity*l.unit_cost_amount)-purchasing.po_line_net(l)),0)::numeric line_discount
    from purchasing.purchase_order_lines l where l.purchase_order_id=p_order_id),
  y as(select x.*,case when o.order_discount_type='percentage' then
      (x.subtotal-x.line_discount)*(o.order_discount_value/100)
    when o.order_discount_type='fixed' then o.order_discount_value else 0 end order_discount
    from x join purchasing.purchase_orders o on o.id=p_order_id)
  select jsonb_build_object('subtotal',round(subtotal,2),'lineDiscount',round(line_discount,2),
    'orderDiscount',round(order_discount,2),'total',greatest(0,round(subtotal-line_discount-order_discount,2))) from y;
$$;

create or replace function purchasing.record_po_transition(p_order_id uuid,p_from text,p_to text,p_reason text,p_role text)
returns void language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  select coalesce(max(sequence_number),0)+1 into n from purchasing.purchase_transitions where purchase_order_id=p_order_id;
  insert into purchasing.purchase_transitions(purchase_order_id,sequence_number,from_state_key,to_state_key,
    occurred_at,actor_id,actor_role,reason,rule_version,idempotency_key)
  values(p_order_id,n,p_from,p_to,statement_timestamp(),auth.uid(),p_role,nullif(btrim(p_reason),''),'sprint-20-v1',gen_random_uuid()::text);
end $$;

create or replace function public.admin_create_purchase_order(p_supplier_id uuid,p_is_emergency boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare role_key text; org_id uuid; location_id uuid; order_id uuid; supplier_state text;
begin
  role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
  select s.status_key into supplier_state from purchasing.suppliers s where s.id=p_supplier_id;
  if supplier_state<>'active' then raise exception'Only an active supplier can receive a new purchase order.';end if;
  select o.id,l.id into org_id,location_id from organization.organizations o
    join organization.locations l on l.organization_id=o.id and l.code='main-inventory' where o.code='reyon-online';
  insert into purchasing.purchase_orders(organization_id,supplier_id,destination_location_id,currency_code,
    source_namespace,source_reference,idempotency_key,occurred_at,created_by,is_emergency)
  values(org_id,p_supplier_id,location_id,'BDT','admin-purchase-order',gen_random_uuid()::text,gen_random_uuid()::text,
    statement_timestamp(),auth.uid(),coalesce(p_is_emergency,false)) returning id into order_id;
  perform purchasing.record_po_transition(order_id,null,'draft',null,role_key);return order_id;
end $$;

create or replace function public.admin_save_purchase_order_line(p_order_id uuid,p_variant_id uuid,p_order_unit text,
  p_quantity numeric,p_unit_cost numeric,p_discount_type text default null,p_discount_value numeric default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare role_key text; rel purchasing.supplier_variant_relationships%rowtype; po purchasing.purchase_orders%rowtype;
  units numeric; packs numeric; line_id uuid; line_no integer; base numeric; discount numeric;
begin
  role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
  select * into po from purchasing.purchase_orders where id=p_order_id for update;
  if po.status_key<>'draft' then raise exception'Only Draft purchase orders can be edited.';end if;
  select * into rel from purchasing.supplier_variant_relationships where supplier_id=po.supplier_id
    and catalog_variant_id=p_variant_id and is_active;
  if rel.id is null then raise exception'An active supplier-variant relationship is required.';end if;
  if p_order_unit not in('unit','pack') or p_quantity<=0 or p_unit_cost<0 then raise exception'Quantity, order unit, or cost is invalid.';end if;
  if p_order_unit='pack' then
    if p_quantity<>trunc(p_quantity) then raise exception'Pack quantity must be a whole number.';end if;
    packs:=p_quantity;units:=p_quantity*rel.pack_size;
  else packs:=null;units:=p_quantity;end if;
  if units<rel.minimum_order_quantity then raise exception'Quantity is below the supplier minimum order quantity.';end if;
  base:=round(units*p_unit_cost,2);
  if p_discount_type is not null and p_discount_type not in('fixed','percentage') then raise exception'Discount type is invalid.';end if;
  if p_discount_value<0 or (p_discount_type='percentage' and p_discount_value>100) then raise exception'Discount is invalid.';end if;
  discount:=case when p_discount_type='fixed'then p_discount_value when p_discount_type='percentage'then base*p_discount_value/100 else 0 end;
  if discount>base then raise exception'Discount cannot exceed the line amount.';end if;
  select coalesce(max(line_number),0)+1 into line_no from purchasing.purchase_order_lines where purchase_order_id=p_order_id;
  insert into purchasing.purchase_order_lines(purchase_order_id,line_number,catalog_variant_id,supplier_relationship_id,
    sku_snapshot,product_name_snapshot,variant_label_snapshot,quantity,unit_cost_amount,order_unit_key,
    pack_size_snapshot,ordered_pack_count,discount_type,discount_value)
  select po.id,line_no,v.id,rel.id,v.sku,p.name,v.label,units,p_unit_cost,p_order_unit,rel.pack_size,packs,p_discount_type,p_discount_value
    from catalog.variants v join catalog.products p on p.id=v.product_id where v.id=p_variant_id
  on conflict(purchase_order_id,catalog_variant_id) do update set supplier_relationship_id=excluded.supplier_relationship_id,
    sku_snapshot=excluded.sku_snapshot,product_name_snapshot=excluded.product_name_snapshot,
    variant_label_snapshot=excluded.variant_label_snapshot,quantity=excluded.quantity,unit_cost_amount=excluded.unit_cost_amount,
    order_unit_key=excluded.order_unit_key,pack_size_snapshot=excluded.pack_size_snapshot,
    ordered_pack_count=excluded.ordered_pack_count,discount_type=excluded.discount_type,discount_value=excluded.discount_value
  returning id into line_id;return line_id;
end $$;

create or replace function public.admin_set_purchase_order_discount(p_order_id uuid,p_discount_type text,p_discount_value numeric)
returns void language plpgsql security definer set search_path='' as $$
declare subtotal numeric; line_discounts numeric; amount numeric;
begin
  if public.reyon_admin_role() is null then raise exception'Administrator access required.';end if;
  if not exists(select 1 from purchasing.purchase_orders where id=p_order_id and status_key='draft')then raise exception'Only Draft purchase orders can be edited.';end if;
  if p_discount_type is not null and p_discount_type not in('fixed','percentage')then raise exception'Discount type is invalid.';end if;
  if p_discount_value<0 or(p_discount_type='percentage'and p_discount_value>100)then raise exception'Discount is invalid.';end if;
  select coalesce(sum(quantity*unit_cost_amount),0),coalesce(sum(quantity*unit_cost_amount-purchasing.po_line_net(l)),0)
    into subtotal,line_discounts from purchasing.purchase_order_lines l where purchase_order_id=p_order_id;
  amount:=case when p_discount_type='fixed'then p_discount_value when p_discount_type='percentage'then(subtotal-line_discounts)*p_discount_value/100 else 0 end;
  if amount>subtotal-line_discounts then raise exception'Discount cannot exceed the applicable subtotal.';end if;
  update purchasing.purchase_orders set order_discount_type=p_discount_type,order_discount_value=p_discount_value where id=p_order_id;
end $$;

create or replace function public.admin_transition_purchase_order(p_order_id uuid,p_to_state text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare role_key text; po purchasing.purchase_orders%rowtype; totals jsonb;
begin
  role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
  select * into po from purchasing.purchase_orders where id=p_order_id for update;
  if po.id is null then raise exception'Purchase order not found.';end if;
  if p_to_state='pending-approval' then
    if po.status_key<>'draft' or not exists(select 1 from purchasing.purchase_order_lines where purchase_order_id=po.id)then raise exception'A Draft PO with at least one line is required.';end if;
    totals:=purchasing.po_totals(po.id);if (totals->>'total')::numeric<0 then raise exception'PO total is invalid.';end if;
  elsif p_to_state in('approved','rejected') then
    if po.status_key<>'pending-approval'or role_key not in('admin','super-admin')then raise exception'Approval permission or state is invalid.';end if;
    if p_to_state='rejected'and nullif(btrim(p_reason),'')is null then raise exception'Rejection reason is required.';end if;
  elsif p_to_state='ordered' then
    if po.status_key<>'approved'or role_key not in('admin','super-admin')then raise exception'Only an approved PO can be ordered.';end if;
  else raise exception'Purchase order transition is not allowed by this milestone.';end if;
  update purchasing.purchase_orders set status_key=p_to_state,
    approved_by=case when p_to_state='approved'then auth.uid()else approved_by end,
    approved_at=case when p_to_state='approved'then statement_timestamp()else approved_at end where id=po.id;
  perform purchasing.record_po_transition(po.id,po.status_key,p_to_state,p_reason,role_key);
end $$;

create or replace function public.admin_amend_purchase_order(p_order_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare role_key text; po purchasing.purchase_orders%rowtype;
begin
  role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin authority required.';end if;
  if nullif(btrim(p_reason),'')is null then raise exception'Amendment reason is required.';end if;
  select * into po from purchasing.purchase_orders where id=p_order_id for update;
  if po.status_key<>'approved'then raise exception'Only an Approved, not-yet-ordered PO can be amended.';end if;
  update purchasing.purchase_orders set status_key='draft',amendment_number=amendment_number+1,
    approved_by=null,approved_at=null where id=po.id;
  perform purchasing.record_po_transition(po.id,'approved','draft','Amendment: '||btrim(p_reason),role_key);
end $$;

create or replace function public.admin_cancel_purchase_order(p_order_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare role_key text; po purchasing.purchase_orders%rowtype;
begin
  role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin cancellation authority required.';end if;
  if nullif(btrim(p_reason),'')is null then raise exception'Cancellation reason is required.';end if;
  select * into po from purchasing.purchase_orders where id=p_order_id for update;
  if po.status_key not in('draft','pending-approval','approved','ordered')then raise exception'Purchase order can no longer be cancelled here.';end if;
  update purchasing.purchase_orders set status_key='cancelled'where id=po.id;
  perform purchasing.record_po_transition(po.id,po.status_key,'cancelled',p_reason,role_key);
end $$;

create or replace function public.admin_purchase_order_register()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.reyon_admin_role()is null then raise exception'Administrator access required.';end if;
 return jsonb_build_object(
  'suppliers',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.display_name,'code',s.code)order by s.display_name)
    from purchasing.suppliers s join organization.organizations o on o.id=s.organization_id where o.code='reyon-online'and s.status_key='active'),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',po.id,'reference',po.external_reference,'supplierId',po.supplier_id,
    'supplierName',s.display_name,'status',po.status_key,'currency',po.currency_code,'isEmergency',po.is_emergency,
    'amendmentNumber',po.amendment_number,'createdAt',po.created_at,'updatedAt',po.updated_at,
    'totals',purchasing.po_totals(po.id),'lines',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'variantId',l.catalog_variant_id,
      'sku',l.sku_snapshot,'productName',l.product_name_snapshot,'variantLabel',l.variant_label_snapshot,'quantity',l.quantity,
      'unitCost',l.unit_cost_amount,'orderUnit',l.order_unit_key,'packSize',l.pack_size_snapshot,'packCount',l.ordered_pack_count,
      'discountType',l.discount_type,'discountValue',l.discount_value,'lineTotal',purchasing.po_line_net(l))order by l.line_number)
      from purchasing.purchase_order_lines l where l.purchase_order_id=po.id),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('sequence',t.sequence_number,'fromState',t.from_state_key,
      'toState',t.to_state_key,'reason',t.reason,'actorRole',t.actor_role,'occurredAt',t.occurred_at)order by t.sequence_number desc)
      from purchasing.purchase_transitions t where t.purchase_order_id=po.id),'[]'::jsonb))order by po.created_at desc)
    from purchasing.purchase_orders po join purchasing.suppliers s on s.id=po.supplier_id),'[]'::jsonb),
  'relationships',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'supplierId',r.supplier_id,'variantId',r.catalog_variant_id,
    'productName',p.name,'variantLabel',v.label,'sku',v.sku,'supplierSku',r.supplier_sku,'moq',r.minimum_order_quantity,
    'packSize',r.pack_size,'cost',r.purchase_cost_amount,'leadTimeDays',r.lead_time_days,'isPreferred',r.is_preferred)
    order by p.name,v.label)from purchasing.supplier_variant_relationships r join catalog.variants v on v.id=r.catalog_variant_id
    join catalog.products p on p.id=v.product_id join purchasing.suppliers s on s.id=r.supplier_id
    where r.is_active and s.status_key='active'),'[]'::jsonb));
end $$;

revoke all on function public.admin_create_purchase_order(uuid,boolean)from public,anon;
revoke all on function public.admin_save_purchase_order_line(uuid,uuid,text,numeric,numeric,text,numeric)from public,anon;
revoke all on function public.admin_set_purchase_order_discount(uuid,text,numeric)from public,anon;
revoke all on function public.admin_transition_purchase_order(uuid,text,text)from public,anon;
revoke all on function public.admin_amend_purchase_order(uuid,text)from public,anon;
revoke all on function public.admin_cancel_purchase_order(uuid,text)from public,anon;
revoke all on function public.admin_purchase_order_register()from public,anon;
grant execute on function public.admin_create_purchase_order(uuid,boolean)to authenticated;
grant execute on function public.admin_save_purchase_order_line(uuid,uuid,text,numeric,numeric,text,numeric)to authenticated;
grant execute on function public.admin_set_purchase_order_discount(uuid,text,numeric)to authenticated;
grant execute on function public.admin_transition_purchase_order(uuid,text,text)to authenticated;
grant execute on function public.admin_amend_purchase_order(uuid,text)to authenticated;
grant execute on function public.admin_cancel_purchase_order(uuid,text)to authenticated;
grant execute on function public.admin_purchase_order_register()to authenticated;

comment on table purchasing.purchase_orders is'Governed BDT purchase order; inventory changes only through separately approved receiving.';
