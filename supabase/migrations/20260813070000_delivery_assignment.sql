-- REYON Business OS: Sprint 18 one-order/one-shipment creation and assignment.

create table fulfillment.delivery_partners (
  id uuid primary key default gen_random_uuid(),
  partner_key text not null unique,
  display_name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint delivery_partner_key_format check (partner_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_partner_name_present check (btrim(display_name) <> '')
);
create unique index one_active_delivery_partner_idx on fulfillment.delivery_partners(is_active) where is_active;

alter table fulfillment.fulfillments
  add column current_state_key text,
  add column partner_id uuid references fulfillment.delivery_partners(id) on delete restrict,
  add column handler_name text,
  add constraint fulfillment_state_format check (current_state_key is null or current_state_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint fulfillment_handler_present check (handler_name is null or btrim(handler_name) <> '');
create unique index one_fulfillment_per_order_idx on fulfillment.fulfillments(order_id);

create table fulfillment.delivery_states (
  state_key text primary key,
  display_name text not null unique,
  state_kind text not null check (state_kind in ('standard', 'exception', 'terminal')),
  display_order integer not null unique
);
insert into fulfillment.delivery_states values
  ('ready-for-dispatch','Ready for Dispatch','standard',10),
  ('courier-assigned','Courier Assigned','standard',20),
  ('picked-up','Picked Up','standard',30),
  ('in-transit','In Transit','standard',40),
  ('out-for-delivery','Out for Delivery','standard',50),
  ('delivered','Delivered','terminal',60),
  ('delivery-failed','Delivery Failed','exception',70),
  ('delivery-cancelled','Delivery Cancelled','terminal',80),
  ('lost','Lost','exception',90),('damaged','Damaged','exception',100),
  ('returned','Returned','terminal',110);

create table fulfillment.delivery_transition_notes (
  transition_id uuid primary key references fulfillment.fulfillment_transitions(id) on delete restrict,
  note text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint delivery_transition_note_present check (btrim(note) <> '')
);
create trigger delivery_notes_prevent_mutation before update or delete on fulfillment.delivery_transition_notes
for each row execute function fulfillment.prevent_evidence_mutation();

create trigger delivery_partners_set_updated_at before update on fulfillment.delivery_partners
for each row execute function fulfillment.set_updated_at();
alter table fulfillment.delivery_partners enable row level security;
alter table fulfillment.delivery_states enable row level security;
alter table fulfillment.delivery_transition_notes enable row level security;
revoke all on fulfillment.delivery_partners, fulfillment.delivery_states, fulfillment.delivery_transition_notes from public, anon, authenticated;
grant all on fulfillment.delivery_partners, fulfillment.delivery_states, fulfillment.delivery_transition_notes to service_role;

create or replace function fulfillment.create_shipment_for_packed_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_fulfillment_id uuid; v_location_id uuid;
begin
  if new.to_state_key <> 'packed' then return new; end if;
  select l.id into v_location_id from organization.locations l join organization.organizations o on o.id=l.organization_id where o.code='reyon-online' and l.code='main-inventory';
  insert into fulfillment.fulfillments(order_id,location_id,fulfillment_type_key,source_namespace,source_reference,idempotency_key,occurred_at,current_state_key)
  select o.id,v_location_id,'delivery','sales-order',o.external_reference,'order-shipment:'||o.id::text,new.occurred_at,'ready-for-dispatch'
  from sales.orders o where o.id=new.order_id returning id into v_fulfillment_id;
  insert into fulfillment.fulfillment_lines(fulfillment_id,line_number,order_line_id,quantity)
  select v_fulfillment_id,line_number,id,quantity from sales.order_lines where order_id=new.order_id order by line_number;
  insert into fulfillment.fulfillment_transitions(fulfillment_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,rule_version,idempotency_key)
  values(v_fulfillment_id,1,null,'ready-for-dispatch',new.occurred_at,new.actor_id,'sprint-18-v1','shipment-ready:'||v_fulfillment_id::text);
  return new;
end$$;
create trigger packed_order_creates_shipment after insert on sales.order_transitions
for each row execute function fulfillment.create_shipment_for_packed_order();

create or replace function public.admin_configure_delivery_partner(p_partner_key text,p_display_name text,p_is_active boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.reyon_admin_role() not in('super-admin','admin') then raise exception 'Admin permission required.';end if;
  if nullif(btrim(p_partner_key),'') is null or nullif(btrim(p_display_name),'') is null then raise exception 'Partner key and name are required.';end if;
  if p_partner_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Partner key must be URL-safe.';end if;
  if p_is_active then update fulfillment.delivery_partners set is_active=false where is_active;end if;
  insert into fulfillment.delivery_partners(partner_key,display_name,is_active) values(p_partner_key,btrim(p_display_name),p_is_active)
  on conflict(partner_key)do update set display_name=excluded.display_name,is_active=excluded.is_active;
end$$;

create or replace function public.admin_assign_shipment(p_fulfillment_id uuid,p_handler_name text,p_shipment_reference text)
returns void language plpgsql security definer set search_path='' as $$
declare f fulfillment.fulfillments%rowtype;partner uuid;seq integer;t_id uuid;
begin
  if public.reyon_admin_role() is null then raise exception 'Administrator access required.';end if;
  if nullif(btrim(p_handler_name),'') is null or nullif(btrim(p_shipment_reference),'') is null then raise exception 'Handler and shipment reference are required.';end if;
  select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
  if f.current_state_key<>'ready-for-dispatch' then raise exception 'Only Ready for Dispatch shipments can be assigned.';end if;
  select id into partner from fulfillment.delivery_partners where is_active;
  if partner is null then raise exception 'Configure an active delivery partner first.';end if;
  insert into fulfillment.delivery_references(fulfillment_id,reference_type_key,provider_namespace,external_reference)
  select f.id,'shipment',partner_key,btrim(p_shipment_reference) from fulfillment.delivery_partners where id=partner;
  select coalesce(max(sequence_number),0)+1 into seq from fulfillment.fulfillment_transitions where fulfillment_id=f.id;
  update fulfillment.fulfillments set partner_id=partner,handler_name=btrim(p_handler_name),current_state_key='courier-assigned' where id=f.id;
  insert into fulfillment.fulfillment_transitions(fulfillment_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,rule_version,idempotency_key)
  values(f.id,seq,f.current_state_key,'courier-assigned',statement_timestamp(),auth.uid(),'sprint-18-v1','shipment-assigned:'||f.id::text) returning id into t_id;
  insert into fulfillment.delivery_transition_notes(transition_id,note)values(t_id,'Assigned handler: '||btrim(p_handler_name));
end$$;

create or replace function public.admin_delivery_operations() returns jsonb language sql stable security definer set search_path='' as $$
select case when public.is_reyon_admin() then jsonb_build_object(
 'partners',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'key',partner_key,'name',display_name,'isActive',is_active)order by display_name),'[]'::jsonb)from fulfillment.delivery_partners),
 'shipments',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'orderId',o.id,'orderNumber',o.external_reference,'state',f.current_state_key,'partner',p.display_name,'handler',f.handler_name,'reference',r.external_reference,'createdAt',f.created_at)order by f.created_at desc),'[]'::jsonb)from fulfillment.fulfillments f join sales.orders o on o.id=f.order_id left join fulfillment.delivery_partners p on p.id=f.partner_id left join lateral(select external_reference from fulfillment.delivery_references where fulfillment_id=f.id order by created_at desc limit 1)r on true)
)else null end$$;

revoke all on function public.admin_configure_delivery_partner(text,text,boolean),public.admin_assign_shipment(uuid,text,text),public.admin_delivery_operations() from public,anon;
grant execute on function public.admin_configure_delivery_partner(text,text,boolean),public.admin_assign_shipment(uuid,text,text),public.admin_delivery_operations() to authenticated;

create or replace function notifications.enqueue_delivery_event()returns trigger language plpgsql security definer set search_path=''as $$
declare oid uuid;begin select order_id into oid from fulfillment.fulfillments where id=new.fulfillment_id;
insert into notifications.outbox(event_key,audience_key,order_id,payload)values('delivery-'||new.to_state_key,'customer',oid,jsonb_build_object('fulfillmentId',new.fulfillment_id,'transitionId',new.id)),('delivery-'||new.to_state_key,'admin',oid,jsonb_build_object('fulfillmentId',new.fulfillment_id,'transitionId',new.id));return new;end$$;
create trigger delivery_transition_notification after insert on fulfillment.fulfillment_transitions for each row execute function notifications.enqueue_delivery_event();
