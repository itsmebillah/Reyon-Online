-- Sprint 20: multiple/partial purchase receipts, inspection, and accepted-only inventory entry.

create sequence purchasing.purchase_receipt_reference_sequence;

create table purchasing.purchase_receipts(
 id uuid primary key default gen_random_uuid(),
 purchase_order_id uuid not null references purchasing.purchase_orders(id)on delete restrict,
 receipt_reference text not null,
 supplier_delivery_reference text,
 evidence_reference text,
 discrepancy_note text,
 excess_approved boolean not null default false,
 received_at timestamptz not null default statement_timestamp(),
 received_by uuid not null,
 received_by_role text not null,
 constraint purchase_receipt_reference_unique unique(receipt_reference),
 constraint purchase_receipt_supplier_reference_present check(supplier_delivery_reference is null or btrim(supplier_delivery_reference)<>''),
 constraint purchase_receipt_evidence_present check(evidence_reference is null or btrim(evidence_reference)<>''),
 constraint purchase_receipt_discrepancy_present check(discrepancy_note is null or btrim(discrepancy_note)<>'')
);
create unique index purchase_receipt_supplier_delivery_unique on purchasing.purchase_receipts(purchase_order_id,supplier_delivery_reference)
 where supplier_delivery_reference is not null;
create unique index purchase_receipt_evidence_unique on purchasing.purchase_receipts(purchase_order_id,evidence_reference)
 where evidence_reference is not null;

create table purchasing.purchase_receipt_lines(
 id uuid primary key default gen_random_uuid(),
 purchase_receipt_id uuid not null references purchasing.purchase_receipts(id)on delete restrict,
 purchase_order_line_id uuid not null references purchasing.purchase_order_lines(id)on delete restrict,
 accepted_quantity numeric(20,6)not null default 0,
 damaged_rejected_quantity numeric(20,6)not null default 0,
 quarantined_quantity numeric(20,6)not null default 0,
 short_quantity numeric(20,6)not null default 0,
 excess_quantity numeric(20,6)not null default 0,
 batch_code text,
 expires_on date,
 inventory_movement_id uuid references inventory.movements(id)on delete restrict,
 inspected_at timestamptz not null default statement_timestamp(),
 inspected_by uuid not null,
 inspected_by_role text not null,
 constraint purchase_receipt_quantities_nonnegative check(accepted_quantity>=0 and damaged_rejected_quantity>=0 and quarantined_quantity>=0 and short_quantity>=0 and excess_quantity>=0),
 constraint purchase_receipt_observation_present check(accepted_quantity+damaged_rejected_quantity+quarantined_quantity+short_quantity>0),
 constraint purchase_receipt_batch_present check(batch_code is null or btrim(batch_code)<>''),
 constraint purchase_receipt_expiry_requires_batch check(expires_on is null or batch_code is not null),
 constraint purchase_receipt_line_once unique(purchase_receipt_id,purchase_order_line_id)
);

create index purchase_receipts_order_idx on purchasing.purchase_receipts(purchase_order_id,received_at);
create index purchase_receipt_lines_order_line_idx on purchasing.purchase_receipt_lines(purchase_order_line_id);
create trigger purchase_receipts_immutable before update or delete on purchasing.purchase_receipts for each row execute function purchasing.prevent_transition_mutation();
create trigger purchase_receipt_lines_immutable before update or delete on purchasing.purchase_receipt_lines for each row execute function purchasing.prevent_transition_mutation();
alter table purchasing.purchase_receipts enable row level security;
alter table purchasing.purchase_receipt_lines enable row level security;
revoke all on purchasing.purchase_receipts,purchasing.purchase_receipt_lines from public,anon,authenticated;
grant all on purchasing.purchase_receipts,purchasing.purchase_receipt_lines to service_role;

create or replace function public.admin_receive_purchase_line(
 p_order_id uuid,p_order_line_id uuid,p_accepted numeric,p_damaged_rejected numeric,p_quarantined numeric,
 p_short numeric default 0,p_supplier_delivery_reference text default null,p_evidence_reference text default null,
 p_batch_code text default null,p_expires_on date default null,p_discrepancy_note text default null,p_approve_excess boolean default false)
returns uuid language plpgsql security definer set search_path=''as $$
declare role_key text;po purchasing.purchase_orders%rowtype;pol purchasing.purchase_order_lines%rowtype;
 observed numeric;prior_received numeric;new_received numeric;excess numeric;receipt_id uuid;receipt_ref text;
 item inventory.stock_items%rowtype;location_id uuid;lot_id uuid;movement_id uuid;old_state text;new_state text;
 order_total numeric;received_total numeric;
begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if least(coalesce(p_accepted,-1),coalesce(p_damaged_rejected,-1),coalesce(p_quarantined,-1),coalesce(p_short,-1))<0 then raise exception'Receipt quantities cannot be negative.';end if;
 observed:=p_accepted+p_damaged_rejected+p_quarantined;
 if observed<=0 and p_short<=0 then raise exception'Record a received or short quantity.';end if;
 if p_expires_on is not null and nullif(btrim(p_batch_code),'')is null then raise exception'Batch code is required when expiry is captured.';end if;
 select *into po from purchasing.purchase_orders where id=p_order_id for update;
 if po.id is null or po.status_key not in('approved','ordered','partially-received')then raise exception'Only an Approved or Ordered PO can be received.';end if;
 select *into pol from purchasing.purchase_order_lines where id=p_order_line_id and purchase_order_id=po.id for update;
 if pol.id is null then raise exception'Purchase order line not found.';end if;
 select coalesce(sum(rl.accepted_quantity+rl.damaged_rejected_quantity+rl.quarantined_quantity),0)into prior_received
  from purchasing.purchase_receipt_lines rl where rl.purchase_order_line_id=pol.id;
 if p_short>greatest(0,pol.quantity-prior_received-observed)then raise exception'Short quantity exceeds the unaccounted ordered quantity.';end if;
 new_received:=prior_received+observed;
 excess:=greatest(0,new_received-pol.quantity)-greatest(0,prior_received-pol.quantity);
 if excess>0 then
  if not p_approve_excess or role_key not in('admin','super-admin')then raise exception'Excess receipt requires Admin review and approval.';end if;
  if nullif(btrim(p_discrepancy_note),'')is null then raise exception'Excess receipt requires a discrepancy note.';end if;
 end if;
 if (p_short>0 or p_damaged_rejected>0 or p_quarantined>0)and nullif(btrim(p_discrepancy_note),'')is null then raise exception'Discrepancy note is required.';end if;
 if nullif(btrim(p_supplier_delivery_reference),'')is not null and exists(select 1 from purchasing.purchase_receipts where purchase_order_id=po.id and supplier_delivery_reference=btrim(p_supplier_delivery_reference))then raise exception'This supplier delivery reference is already recorded.';end if;
 receipt_id:=gen_random_uuid();receipt_ref:='PR-'||extract(year from statement_timestamp()at time zone'Asia/Dhaka')::integer||'-'||lpad(nextval('purchasing.purchase_receipt_reference_sequence')::text,6,'0');
 insert into purchasing.purchase_receipts(id,purchase_order_id,receipt_reference,supplier_delivery_reference,evidence_reference,
  discrepancy_note,excess_approved,received_by,received_by_role)
 values(receipt_id,po.id,receipt_ref,nullif(btrim(p_supplier_delivery_reference),''),nullif(btrim(p_evidence_reference),''),
  nullif(btrim(p_discrepancy_note),''),excess>0,auth.uid(),role_key);
 if p_accepted>0 then
  select l.id into location_id from organization.locations l join organization.organizations o on o.id=l.organization_id where o.code='reyon-online'and l.code='main-inventory';
  insert into inventory.stock_items(catalog_variant_id,code,display_name,base_unit_code)
   select v.id,v.sku,p.name||' — '||v.label,'UNIT'from catalog.variants v join catalog.products p on p.id=v.product_id where v.id=pol.catalog_variant_id
   on conflict(catalog_variant_id)do update set display_name=excluded.display_name returning *into item;
  if nullif(btrim(p_batch_code),'')is not null then
   insert into inventory.lots(stock_item_id,lot_code,expires_on)values(item.id,btrim(p_batch_code),p_expires_on)
   on conflict(stock_item_id,lot_code)do nothing;
   select id into lot_id from inventory.lots where stock_item_id=item.id and lot_code=btrim(p_batch_code);
   if p_expires_on is not null and exists(select 1 from inventory.lots where id=lot_id and expires_on is not null and expires_on<>p_expires_on)then
    raise exception'Batch expiry conflicts with existing lot evidence.';
   end if;
  end if;
  movement_id:=gen_random_uuid();
  insert into inventory.movements(id,movement_type_key,occurred_at,source_namespace,source_reference,idempotency_key,
   reason_key,reason_note,actor_id,actor_label)
  values(movement_id,'purchase-receive',statement_timestamp(),'purchase-receipt',receipt_id::text,
   'purchase-receipt:'||receipt_id::text,'accepted-purchase-receipt','Accepted against '||po.external_reference,
   auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text));
  insert into inventory.movement_lines(movement_id,line_number,stock_item_id,location_id,lot_id,quantity_delta,unit_code,condition_key)
  values(movement_id,1,item.id,location_id,lot_id,p_accepted,item.base_unit_code,'sellable');
 end if;
 insert into purchasing.purchase_receipt_lines(id,purchase_receipt_id,purchase_order_line_id,accepted_quantity,
  damaged_rejected_quantity,quarantined_quantity,short_quantity,excess_quantity,batch_code,expires_on,
  inventory_movement_id,inspected_by,inspected_by_role)
 values(gen_random_uuid(),receipt_id,pol.id,p_accepted,p_damaged_rejected,p_quarantined,p_short,excess,
  nullif(btrim(p_batch_code),''),p_expires_on,movement_id,auth.uid(),role_key);
 old_state:=po.status_key;
 if old_state='approved'then
  update purchasing.purchase_orders set status_key='ordered'where id=po.id;
  perform purchasing.record_po_transition(po.id,'approved','ordered','Physical receipt confirms supplier order.',role_key);
  old_state:='ordered';
 end if;
 select coalesce(sum(quantity),0)into order_total from purchasing.purchase_order_lines where purchase_order_id=po.id;
 select coalesce(sum(rl.accepted_quantity+rl.damaged_rejected_quantity+rl.quarantined_quantity),0)into received_total
  from purchasing.purchase_receipt_lines rl join purchasing.purchase_order_lines pl on pl.id=rl.purchase_order_line_id where pl.purchase_order_id=po.id;
 new_state:=case when received_total>=order_total then'fully-received'else'partially-received'end;
 if old_state<>new_state then
  update purchasing.purchase_orders set status_key=new_state where id=po.id;
  perform purchasing.record_po_transition(po.id,old_state,new_state,'Receipt '||receipt_ref||' recorded.',role_key);
 end if;
 return receipt_id;
end$$;

create or replace function public.admin_purchase_receiving_queue()returns jsonb language sql stable security definer set search_path=''as $$
 select case when public.is_reyon_admin()then jsonb_build_object(
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',po.id,'reference',po.external_reference,'supplierName',s.display_name,
   'status',po.status_key,'lines',coalesce((select jsonb_agg(jsonb_build_object('id',pl.id,'productName',pl.product_name_snapshot,
    'variantLabel',pl.variant_label_snapshot,'sku',pl.sku_snapshot,'orderedQuantity',pl.quantity,
    'receivedQuantity',coalesce((select sum(rl.accepted_quantity+rl.damaged_rejected_quantity+rl.quarantined_quantity)
     from purchasing.purchase_receipt_lines rl where rl.purchase_order_line_id=pl.id),0))order by pl.line_number)
    from purchasing.purchase_order_lines pl where pl.purchase_order_id=po.id),'[]'::jsonb))order by po.created_at desc)
   from purchasing.purchase_orders po join purchasing.suppliers s on s.id=po.supplier_id
   where po.status_key in('approved','ordered','partially-received')),'[]'::jsonb),
  'receipts',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'receiptReference',r.receipt_reference,
   'poReference',po.external_reference,'supplierName',s.display_name,'supplierDeliveryReference',r.supplier_delivery_reference,
   'evidenceReference',r.evidence_reference,'receivedAt',r.received_at,'actorRole',r.received_by_role,
   'productName',pl.product_name_snapshot,'variantLabel',pl.variant_label_snapshot,'accepted',rl.accepted_quantity,
   'damagedRejected',rl.damaged_rejected_quantity,'quarantined',rl.quarantined_quantity,'short',rl.short_quantity,
   'excess',rl.excess_quantity,'batchCode',rl.batch_code,'expiresOn',rl.expires_on,'movementId',rl.inventory_movement_id)
   order by r.received_at desc)from purchasing.purchase_receipts r join purchasing.purchase_receipt_lines rl on rl.purchase_receipt_id=r.id
   join purchasing.purchase_orders po on po.id=r.purchase_order_id join purchasing.suppliers s on s.id=po.supplier_id
   join purchasing.purchase_order_lines pl on pl.id=rl.purchase_order_line_id),'[]'::jsonb))else null end;
$$;

revoke all on function public.admin_receive_purchase_line(uuid,uuid,numeric,numeric,numeric,numeric,text,text,text,date,text,boolean)from public,anon;
revoke all on function public.admin_purchase_receiving_queue()from public,anon;
grant execute on function public.admin_receive_purchase_line(uuid,uuid,numeric,numeric,numeric,numeric,text,text,text,date,text,boolean)to authenticated;
grant execute on function public.admin_purchase_receiving_queue()to authenticated;

comment on table purchasing.purchase_receipt_lines is'Immutable observed purchase receipt outcomes; only accepted quantity references a purchase-receive inventory movement.';
