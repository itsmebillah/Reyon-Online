-- Sprint 20: auditable partial purchase returns against accepted receipt quantities.

create sequence purchasing.purchase_return_reference_sequence;
create table purchasing.purchase_returns(
 id uuid primary key default gen_random_uuid(),purchase_receipt_line_id uuid not null references purchasing.purchase_receipt_lines(id)on delete restrict,
 return_reference text not null unique,quantity numeric(20,6)not null check(quantity>0),reason_key text not null,
 note text not null,evidence_reference text,status_key text not null default'requested',requested_by uuid not null,requested_by_role text not null,
 requested_at timestamptz not null default statement_timestamp(),inventory_movement_id uuid references inventory.movements(id)on delete restrict,
 constraint purchase_return_reason check(reason_key in('damaged','wrong-product','excess','quality-issue','expired-near-expiry','supplier-discrepancy')),
 constraint purchase_return_status check(status_key in('requested','approved','awaiting-return','returned','completed','rejected','cancelled')),
 constraint purchase_return_note_present check(btrim(note)<>''),constraint purchase_return_evidence_present check(evidence_reference is null or btrim(evidence_reference)<>'')
);
create table purchasing.purchase_return_events(
 id uuid primary key default gen_random_uuid(),purchase_return_id uuid not null references purchasing.purchase_returns(id)on delete restrict,
 sequence_number integer not null,from_state_key text,to_state_key text not null,note text,actor_id uuid not null,actor_role text not null,
 occurred_at timestamptz not null default statement_timestamp(),unique(purchase_return_id,sequence_number)
);
create index purchase_returns_receipt_line_idx on purchasing.purchase_returns(purchase_receipt_line_id);
create trigger purchase_return_events_immutable before update or delete on purchasing.purchase_return_events for each row execute function purchasing.prevent_transition_mutation();
alter table purchasing.purchase_returns enable row level security;alter table purchasing.purchase_return_events enable row level security;
revoke all on purchasing.purchase_returns,purchasing.purchase_return_events from public,anon,authenticated;
grant all on purchasing.purchase_returns,purchasing.purchase_return_events to service_role;

create or replace function purchasing.append_purchase_return_event(p_id uuid,p_from text,p_to text,p_note text,p_role text)
returns void language plpgsql security definer set search_path=''as $$declare n integer;begin
 select coalesce(max(sequence_number),0)+1 into n from purchasing.purchase_return_events where purchase_return_id=p_id;
 insert into purchasing.purchase_return_events(purchase_return_id,sequence_number,from_state_key,to_state_key,note,actor_id,actor_role)
 values(p_id,n,p_from,p_to,nullif(btrim(p_note),''),auth.uid(),p_role);end$$;

create or replace function public.admin_request_purchase_return(p_receipt_line_id uuid,p_quantity numeric,p_reason text,p_note text)
returns uuid language plpgsql security definer set search_path=''as $$
declare role_key text;rl purchasing.purchase_receipt_lines%rowtype;returned numeric;return_id uuid;ref text;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if p_quantity is null or p_quantity<=0 then raise exception'Return quantity must be positive.';end if;
 if p_reason not in('damaged','wrong-product','excess','quality-issue','expired-near-expiry','supplier-discrepancy')then raise exception'Select an approved purchase return reason.';end if;
 if nullif(btrim(p_note),'')is null then raise exception'Return note is required.';end if;
 select *into rl from purchasing.purchase_receipt_lines where id=p_receipt_line_id for update;
 if rl.id is null or rl.accepted_quantity<=0 then raise exception'Only accepted received quantity is eligible for purchase return.';end if;
 select coalesce(sum(quantity),0)into returned from purchasing.purchase_returns where purchase_receipt_line_id=rl.id and status_key not in('rejected','cancelled');
 if returned+p_quantity>rl.accepted_quantity then raise exception'Return quantity exceeds the remaining eligible received quantity.';end if;
 return_id:=gen_random_uuid();ref:='PV-'||extract(year from statement_timestamp()at time zone'Asia/Dhaka')::integer||'-'||lpad(nextval('purchasing.purchase_return_reference_sequence')::text,6,'0');
 insert into purchasing.purchase_returns(id,purchase_receipt_line_id,return_reference,quantity,reason_key,note,requested_by,requested_by_role)
 values(return_id,rl.id,ref,p_quantity,p_reason,btrim(p_note),auth.uid(),role_key);
 perform purchasing.append_purchase_return_event(return_id,null,'requested',p_note,role_key);return return_id;end$$;

create or replace function public.admin_transition_purchase_return(p_return_id uuid,p_target text,p_note text default null,p_evidence_reference text default null)
returns void language plpgsql security definer set search_path=''as $$
declare role_key text;pr purchasing.purchase_returns%rowtype;rl purchasing.purchase_receipt_lines%rowtype;
 receipt purchasing.purchase_receipts%rowtype;pol purchasing.purchase_order_lines%rowtype;item inventory.stock_items%rowtype;
 v_location_id uuid;lot_id uuid;movement_id uuid;on_hand numeric;allowed boolean:=false;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 select *into pr from purchasing.purchase_returns where id=p_return_id for update;if pr.id is null then raise exception'Purchase return not found.';end if;
 if p_target in('approved','rejected')then
  if pr.status_key<>'requested'or role_key not in('admin','super-admin')then raise exception'Admin approval permission or state is invalid.';end if;
  if p_target='rejected'and nullif(btrim(p_note),'')is null then raise exception'Rejection note is required.';end if;allowed:=true;
 elsif p_target='awaiting-return'then allowed:=pr.status_key='approved';
 elsif p_target='returned'then
  if pr.status_key<>'awaiting-return'then raise exception'Return must be awaiting physical return.';end if;
  if nullif(btrim(p_evidence_reference),'')is null then raise exception'Physical return evidence/reference is required.';end if;
  if exists(select 1 from purchasing.purchase_returns where id<>pr.id and evidence_reference=btrim(p_evidence_reference))then raise exception'This return evidence is already recorded.';end if;
  select *into rl from purchasing.purchase_receipt_lines where id=pr.purchase_receipt_line_id;
  select *into receipt from purchasing.purchase_receipts where id=rl.purchase_receipt_id;
  select *into pol from purchasing.purchase_order_lines where id=rl.purchase_order_line_id;
  select *into item from inventory.stock_items where catalog_variant_id=pol.catalog_variant_id for update;
  select l.id into v_location_id from organization.locations l join organization.organizations o on o.id=l.organization_id where o.code='reyon-online'and l.code='main-inventory';
  if rl.batch_code is not null then select id into lot_id from inventory.lots where stock_item_id=item.id and lot_code=rl.batch_code;end if;
  select coalesce(sum(quantity_delta),0)into on_hand from inventory.movement_lines where stock_item_id=item.id and location_id=v_location_id;
  if on_hand<pr.quantity then raise exception'Purchase return would create negative stock.';end if;
  movement_id:=gen_random_uuid();
  insert into inventory.movements(id,movement_type_key,occurred_at,source_namespace,source_reference,idempotency_key,reason_key,reason_note,actor_id,actor_label)
  values(movement_id,'purchase-return',statement_timestamp(),'purchase-return',pr.id::text,'purchase-return:'||pr.id::text,pr.reason_key,btrim(pr.note),auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text));
  insert into inventory.movement_lines(movement_id,line_number,stock_item_id,location_id,lot_id,quantity_delta,unit_code,condition_key)
  values(movement_id,1,item.id,v_location_id,lot_id,-pr.quantity,item.base_unit_code,'supplier-return');allowed:=true;
 elsif p_target='completed'then allowed:=pr.status_key='returned';
 elsif p_target='cancelled'then
  if pr.status_key not in('requested','approved','awaiting-return')or role_key not in('admin','super-admin')or nullif(btrim(p_note),'')is null then raise exception'Cancellation authority, state, and note are required.';end if;allowed:=true;
 end if;
 if not allowed then raise exception'Purchase return transition is not allowed.';end if;
 update purchasing.purchase_returns set status_key=p_target,evidence_reference=case when p_target='returned'then btrim(p_evidence_reference)else evidence_reference end,
  inventory_movement_id=coalesce(movement_id,inventory_movement_id)where id=pr.id;
 perform purchasing.append_purchase_return_event(pr.id,pr.status_key,p_target,p_note,role_key);end$$;

create or replace function public.admin_purchase_return_queue()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.is_reyon_admin()then jsonb_build_object(
 'eligible',coalesce((select jsonb_agg(jsonb_build_object('receiptLineId',rl.id,'receiptReference',r.receipt_reference,'poReference',po.external_reference,
  'supplierName',s.display_name,'productName',pl.product_name_snapshot,'variantLabel',pl.variant_label_snapshot,'batchCode',rl.batch_code,'expiresOn',rl.expires_on,
  'acceptedQuantity',rl.accepted_quantity,'returnedQuantity',coalesce((select sum(pr.quantity)from purchasing.purchase_returns pr where pr.purchase_receipt_line_id=rl.id and pr.status_key not in('rejected','cancelled')),0))order by r.received_at desc)
  from purchasing.purchase_receipt_lines rl join purchasing.purchase_receipts r on r.id=rl.purchase_receipt_id join purchasing.purchase_orders po on po.id=r.purchase_order_id
  join purchasing.suppliers s on s.id=po.supplier_id join purchasing.purchase_order_lines pl on pl.id=rl.purchase_order_line_id where rl.accepted_quantity>0),'[]'::jsonb),
 'returns',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'reference',pr.return_reference,'status',pr.status_key,'reason',pr.reason_key,'note',pr.note,
  'quantity',pr.quantity,'receiptReference',r.receipt_reference,'poReference',po.external_reference,'supplierName',s.display_name,'productName',pl.product_name_snapshot,
  'variantLabel',pl.variant_label_snapshot,'batchCode',rl.batch_code,'expiresOn',rl.expires_on,'evidenceReference',pr.evidence_reference,'movementId',pr.inventory_movement_id,
  'history',coalesce((select jsonb_agg(jsonb_build_object('sequence',e.sequence_number,'fromState',e.from_state_key,'toState',e.to_state_key,'note',e.note,'actorRole',e.actor_role,'occurredAt',e.occurred_at)order by e.sequence_number desc)from purchasing.purchase_return_events e where e.purchase_return_id=pr.id),'[]'::jsonb))order by pr.requested_at desc)
  from purchasing.purchase_returns pr join purchasing.purchase_receipt_lines rl on rl.id=pr.purchase_receipt_line_id join purchasing.purchase_receipts r on r.id=rl.purchase_receipt_id
  join purchasing.purchase_orders po on po.id=r.purchase_order_id join purchasing.suppliers s on s.id=po.supplier_id join purchasing.purchase_order_lines pl on pl.id=rl.purchase_order_line_id),'[]'::jsonb))else null end$$;

revoke all on function public.admin_request_purchase_return(uuid,numeric,text,text),public.admin_transition_purchase_return(uuid,text,text,text),public.admin_purchase_return_queue()from public,anon;
grant execute on function public.admin_request_purchase_return(uuid,numeric,text,text),public.admin_transition_purchase_return(uuid,text,text,text),public.admin_purchase_return_queue()to authenticated;
