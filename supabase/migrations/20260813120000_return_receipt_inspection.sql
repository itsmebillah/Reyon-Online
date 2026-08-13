-- Sprint 19: returned-item receipt, inspection, and inventory disposition.

create table reverse_logistics.return_receipts(
 id uuid primary key default gen_random_uuid(),
 return_request_id uuid not null references reverse_logistics.return_requests(id)on delete restrict,
 return_line_id uuid not null references reverse_logistics.return_lines(id)on delete restrict,
 quantity numeric(20,6)not null check(quantity>0),
 return_reference text not null,
 received_at timestamptz not null default statement_timestamp(),
 received_by uuid not null,
 received_by_role text not null,
 constraint return_receipt_reference_present check(btrim(return_reference)<>''),
 constraint return_receipt_reference_unique unique(return_request_id,return_reference)
);

create table reverse_logistics.inspection_dispositions(
 id uuid primary key default gen_random_uuid(),
 return_request_id uuid not null references reverse_logistics.return_requests(id)on delete restrict,
 return_line_id uuid not null references reverse_logistics.return_lines(id)on delete restrict,
 quantity numeric(20,6)not null check(quantity>0),
 outcome_key text not null check(outcome_key in('sellable','quarantine','damaged-loss','expiry-batch-issue')),
 inspection_note text not null,
 batch_or_expiry_reference text,
 inspected_at timestamptz not null default statement_timestamp(),
 inspected_by uuid not null,
 inspected_by_role text not null,
 inventory_movement_id uuid references inventory.movements(id)on delete restrict,
 constraint inspection_note_present check(btrim(inspection_note)<>''),
 constraint expiry_batch_reference_required check(outcome_key<>'expiry-batch-issue'or(batch_or_expiry_reference is not null and btrim(batch_or_expiry_reference)<>''))
);

create index return_receipts_line_idx on reverse_logistics.return_receipts(return_line_id,received_at);
create index inspection_dispositions_line_idx on reverse_logistics.inspection_dispositions(return_line_id,inspected_at);
create trigger return_receipts_prevent_mutation before update or delete on reverse_logistics.return_receipts for each row execute function sales.prevent_transition_mutation();
create trigger inspection_dispositions_prevent_mutation before update or delete on reverse_logistics.inspection_dispositions for each row execute function sales.prevent_transition_mutation();
alter table reverse_logistics.return_receipts enable row level security;
alter table reverse_logistics.inspection_dispositions enable row level security;
revoke all on reverse_logistics.return_receipts,reverse_logistics.inspection_dispositions from public,anon,authenticated;
grant all on reverse_logistics.return_receipts,reverse_logistics.inspection_dispositions to service_role;

create or replace function public.admin_receive_return(p_request_id uuid,p_quantity numeric,p_return_reference text)
returns uuid language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;rl reverse_logistics.return_lines%rowtype;received numeric;receipt_id uuid;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if p_quantity is null or p_quantity<=0 then raise exception'Received quantity must be positive.';end if;
 if nullif(btrim(p_return_reference),'')is null then raise exception'Return reference is required.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;
 if rr.id is null or rr.current_state_key not in('approved','awaiting-return')then raise exception'Only an approved return can be received.';end if;
 select *into rl from reverse_logistics.return_lines where return_request_id=rr.id for update;
 select coalesce(sum(quantity),0)into received from reverse_logistics.return_receipts where return_line_id=rl.id;
 if received+p_quantity>rl.quantity then raise exception'Received quantity exceeds the approved return quantity.';end if;
 insert into reverse_logistics.return_receipts(return_request_id,return_line_id,quantity,return_reference,received_by,received_by_role)
 values(rr.id,rl.id,p_quantity,btrim(p_return_reference),auth.uid(),role_key)returning id into receipt_id;
 if received+p_quantity=rl.quantity then perform reverse_logistics.append_return_event(rr.id,'received','All approved returned quantity received. Reference: '||btrim(p_return_reference),auth.uid(),role_key);end if;
 return receipt_id;
end$$;

create or replace function public.admin_inspect_return(p_request_id uuid,p_quantity numeric,p_outcome text,p_note text,p_batch_or_expiry_reference text default null)
returns uuid language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;rl reverse_logistics.return_lines%rowtype;ol sales.order_lines%rowtype;
 received numeric;inspected numeric;disposition_id uuid;movement_id uuid;location_id uuid;item inventory.stock_items%rowtype;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if p_quantity is null or p_quantity<=0 then raise exception'Inspected quantity must be positive.';end if;
 if p_outcome not in('sellable','quarantine','damaged-loss','expiry-batch-issue')then raise exception'Select an approved inspection outcome.';end if;
 if nullif(btrim(p_note),'')is null then raise exception'Inspection note is required.';end if;
 if p_outcome='expiry-batch-issue'and nullif(btrim(p_batch_or_expiry_reference),'')is null then raise exception'Batch or expiry reference is required.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;
 if rr.id is null or rr.current_state_key<>'received'then raise exception'Return must be fully received before inspection.';end if;
 select *into rl from reverse_logistics.return_lines where return_request_id=rr.id for update;
 select *into ol from sales.order_lines where id=rl.order_line_id;
 select coalesce(sum(quantity),0)into received from reverse_logistics.return_receipts where return_line_id=rl.id;
 select coalesce(sum(quantity),0)into inspected from reverse_logistics.inspection_dispositions where return_line_id=rl.id;
 if inspected+p_quantity>received then raise exception'Inspection quantity exceeds received quantity.';end if;
 if p_outcome='sellable'then
  select l.id into location_id from organization.locations l join organization.organizations org on org.id=l.organization_id where org.code='reyon-online'and l.code='main-inventory';
  insert into inventory.stock_items(catalog_variant_id,code,display_name,base_unit_code)
  select v.id,v.sku,p.name||' — '||v.label,'UNIT'from catalog.variants v join catalog.products p on p.id=v.product_id where v.id=ol.catalog_variant_id
  on conflict(catalog_variant_id)do update set display_name=excluded.display_name returning *into item;
  if item.id is null or location_id is null then raise exception'Inventory identity is unavailable for this returned item.';end if;
  movement_id:=gen_random_uuid();
  insert into inventory.movements(id,movement_type_key,occurred_at,source_namespace,source_reference,idempotency_key,reason_key,reason_note,actor_id,actor_label)
  values(movement_id,'return-in',statement_timestamp(),'customer-return',rr.id::text,movement_id::text,'inspected-sellable',btrim(p_note),auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text));
  insert into inventory.movement_lines(movement_id,line_number,stock_item_id,location_id,quantity_delta,unit_code,condition_key)
  values(movement_id,1,item.id,location_id,p_quantity,item.base_unit_code,'sellable');
 end if;
 insert into reverse_logistics.inspection_dispositions(return_request_id,return_line_id,quantity,outcome_key,inspection_note,batch_or_expiry_reference,inspected_by,inspected_by_role,inventory_movement_id)
 values(rr.id,rl.id,p_quantity,p_outcome,btrim(p_note),nullif(btrim(p_batch_or_expiry_reference),''),auth.uid(),role_key,movement_id)returning id into disposition_id;
 if inspected+p_quantity=received then perform reverse_logistics.append_return_event(rr.id,'inspected','All received quantity inspected. Final disposition recorded.',auth.uid(),role_key);end if;
 return disposition_id;
end$$;

create or replace function public.admin_return_queue()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object(
 'id',rr.id,'orderNumber',o.external_reference,'state',rr.current_state_key,'reason',rr.reason_key,'condition',rr.condition_key,
 'shippingResponsibility',rr.shipping_responsibility_key,'note',rr.customer_note,'requestedAt',rr.requested_at,
 'lineNumber',ol.line_number,'productName',ol.product_name_snapshot,'variantLabel',ol.variant_label_snapshot,'quantity',rl.quantity,
 'receivedQuantity',(select coalesce(sum(rc.quantity),0)from reverse_logistics.return_receipts rc where rc.return_line_id=rl.id),
 'inspectedQuantity',(select coalesce(sum(d.quantity),0)from reverse_logistics.inspection_dispositions d where d.return_line_id=rl.id),
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('kind',e.evidence_kind,'reference',e.asset_reference)),'[]'::jsonb)from reverse_logistics.return_evidence e where e.return_request_id=rr.id)
)order by rr.requested_at),'[]'::jsonb)else null end
from reverse_logistics.return_requests rr join sales.orders o on o.id=rr.order_id join reverse_logistics.return_lines rl on rl.return_request_id=rr.id join sales.order_lines ol on ol.id=rl.order_line_id
where rr.current_state_key not in('refunded','rejected','withdrawn','cancelled');$$;

revoke all on function public.admin_receive_return(uuid,numeric,text),public.admin_inspect_return(uuid,numeric,text,text,text)from public,anon;
grant execute on function public.admin_receive_return(uuid,numeric,text),public.admin_inspect_return(uuid,numeric,text,text,text)to authenticated;
