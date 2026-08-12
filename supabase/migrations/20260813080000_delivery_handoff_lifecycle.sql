-- REYON Business OS: guarded pickup/handoff and forward delivery lifecycle.

create table fulfillment.handoff_evidence (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null unique references fulfillment.fulfillments(id) on delete restrict,
  handler_name text not null,
  shipment_reference text not null,
  evidence_note text not null,
  picked_up_at timestamptz not null,
  recorded_by uuid not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint handoff_handler_present check (btrim(handler_name) <> ''),
  constraint handoff_reference_present check (btrim(shipment_reference) <> ''),
  constraint handoff_note_present check (btrim(evidence_note) <> '')
);
create trigger handoff_evidence_prevent_mutation before update or delete on fulfillment.handoff_evidence
for each row execute function fulfillment.prevent_evidence_mutation();
alter table fulfillment.handoff_evidence enable row level security;
revoke all on fulfillment.handoff_evidence from public,anon,authenticated;
grant all on fulfillment.handoff_evidence to service_role;

create or replace function public.admin_transition_delivery(
  p_fulfillment_id uuid,p_target_state text,p_note text default null
)returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;seq integer;t_id uuid;shipment_ref text;order_state text;
begin
  if public.reyon_admin_role() is null then raise exception 'Administrator access required.';end if;
  select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
  if f.id is null then raise exception 'Shipment not found.';end if;
  if (f.current_state_key='courier-assigned' and p_target_state<>'picked-up')
    or(f.current_state_key='picked-up' and p_target_state<>'in-transit')
    or(f.current_state_key='in-transit' and p_target_state<>'out-for-delivery') then
    raise exception 'This delivery transition is not allowed.';
  end if;
  if f.current_state_key not in('courier-assigned','picked-up','in-transit')then raise exception 'This shipment cannot advance from its current state.';end if;
  if p_target_state='picked-up' and nullif(btrim(p_note),'') is null then raise exception 'Handoff evidence is required for pickup.';end if;
  select external_reference into shipment_ref from fulfillment.delivery_references where fulfillment_id=f.id and reference_type_key='shipment' order by created_at desc limit 1;
  if p_target_state='picked-up' then
    if f.handler_name is null or shipment_ref is null then raise exception 'Courier, handler, and shipment reference are required.';end if;
    insert into fulfillment.handoff_evidence(fulfillment_id,handler_name,shipment_reference,evidence_note,picked_up_at,recorded_by)
    values(f.id,f.handler_name,shipment_ref,btrim(p_note),statement_timestamp(),auth.uid());
    select current_state_key into order_state from sales.orders where id=f.order_id;
    if order_state<>'packed' then raise exception 'The related order must be Packed before pickup.';end if;
    perform public.admin_transition_order(f.order_id,'shipped',null,'Shipment '||shipment_ref||': '||btrim(p_note));
  end if;
  select coalesce(max(sequence_number),0)+1 into seq from fulfillment.fulfillment_transitions where fulfillment_id=f.id;
  update fulfillment.fulfillments set current_state_key=p_target_state where id=f.id;
  insert into fulfillment.fulfillment_transitions(fulfillment_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,rule_version,idempotency_key)
  values(f.id,seq,f.current_state_key,p_target_state,statement_timestamp(),auth.uid(),'sprint-18-v1','delivery-transition:'||f.id::text||':'||seq::text)returning id into t_id;
  if nullif(btrim(p_note),'') is not null then insert into fulfillment.delivery_transition_notes(transition_id,note)values(t_id,btrim(p_note));end if;
end$$;

create or replace function public.customer_delivery_status(p_order_reference text,p_phone text)
returns jsonb language sql stable security definer set search_path=''as $$
select jsonb_build_object('orderNumber',o.external_reference,'status',s.display_name,'shipmentReference',r.external_reference,'updatedAt',latest.occurred_at)
from sales.orders o join sales.order_addresses a on a.order_id=o.id join fulfillment.fulfillments f on f.order_id=o.id
join fulfillment.delivery_states s on s.state_key=f.current_state_key
left join lateral(select external_reference from fulfillment.delivery_references where fulfillment_id=f.id and reference_type_key='shipment'order by created_at desc limit 1)r on true
left join lateral(select occurred_at from fulfillment.fulfillment_transitions where fulfillment_id=f.id order by sequence_number desc limit 1)latest on true
where o.external_reference=upper(btrim(p_order_reference))and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g');$$;

revoke all on function public.admin_transition_delivery(uuid,text,text)from public,anon;
grant execute on function public.admin_transition_delivery(uuid,text,text)to authenticated;
revoke all on function public.customer_delivery_status(text,text)from public;
grant execute on function public.customer_delivery_status(text,text)to anon,authenticated;
