-- REYON Business OS: Sprint 19 return eligibility and request intake foundation.

create schema if not exists reverse_logistics;
revoke all on schema reverse_logistics from public, anon, authenticated;
grant usage on schema reverse_logistics to service_role;

alter table catalog.products add column is_returnable boolean not null default true;

create table reverse_logistics.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  current_state_key text not null default 'requested' check (current_state_key in (
    'requested','under-review','approved','awaiting-return','received','inspected',
    'refund-pending','refunded','rejected','withdrawn','cancelled'
  )),
  reason_key text not null check (reason_key in (
    'wrong-product','damaged','defective','missing-item','not-as-described','changed-mind','other'
  )),
  condition_key text not null check (condition_key in ('unopened-unused','opened-used','not-received')),
  shipping_responsibility_key text not null check (shipping_responsibility_key in ('reyon','customer','review-required')),
  customer_note text not null,
  requested_at timestamptz not null default statement_timestamp(),
  constraint return_request_note_present check (btrim(customer_note) <> '')
);

create table reverse_logistics.return_lines (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references reverse_logistics.return_requests(id) on delete restrict,
  order_line_id uuid not null references sales.order_lines(id) on delete restrict,
  quantity numeric(20,6) not null check (quantity > 0),
  constraint return_line_once_per_request unique (return_request_id, order_line_id)
);

create table reverse_logistics.return_evidence (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references reverse_logistics.return_requests(id) on delete restrict,
  evidence_kind text not null check (evidence_kind in ('photo','video')),
  asset_reference text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint return_evidence_reference_present check (btrim(asset_reference) <> '')
);

create table reverse_logistics.return_events (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null references reverse_logistics.return_requests(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  from_state_key text,
  to_state_key text not null,
  occurred_at timestamptz not null default statement_timestamp(),
  actor_id uuid,
  actor_role_key text not null,
  reason_note text,
  constraint return_event_sequence_unique unique (return_request_id, sequence_number)
);

create index return_requests_order_idx on reverse_logistics.return_requests(order_id, requested_at);
create index return_lines_order_line_idx on reverse_logistics.return_lines(order_line_id);
create trigger return_requests_prevent_delete before delete on reverse_logistics.return_requests for each row execute function sales.prevent_transition_mutation();
create trigger return_lines_prevent_mutation before update or delete on reverse_logistics.return_lines for each row execute function sales.prevent_transition_mutation();
create trigger return_evidence_prevent_mutation before update or delete on reverse_logistics.return_evidence for each row execute function sales.prevent_transition_mutation();
create trigger return_events_prevent_mutation before update or delete on reverse_logistics.return_events for each row execute function sales.prevent_transition_mutation();

alter table reverse_logistics.return_requests enable row level security;
alter table reverse_logistics.return_lines enable row level security;
alter table reverse_logistics.return_evidence enable row level security;
alter table reverse_logistics.return_events enable row level security;
revoke all on all tables in schema reverse_logistics from public, anon, authenticated;
grant all on all tables in schema reverse_logistics to service_role;

create or replace function public.customer_return_eligible_lines(p_order_reference text, p_phone text)
returns jsonb language sql stable security definer set search_path='' as $$
select case when o.id is null then null else jsonb_build_object(
  'orderNumber',o.external_reference,
  'orderState',o.current_state_key,
  'eligibleUntil',delivered.occurred_at + interval '7 days',
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'lineId',ol.id,'lineNumber',ol.line_number,'productName',ol.product_name_snapshot,
    'variantLabel',ol.variant_label_snapshot,'orderedQuantity',ol.quantity,
    'remainingQuantity',greatest(ol.quantity-coalesce(requested.quantity,0),0),
    'normallyReturnable',coalesce(p.is_returnable,false)
  ) order by ol.line_number)
  from sales.order_lines ol
  left join catalog.variants v on v.id=ol.catalog_variant_id
  left join catalog.products p on p.id=v.product_id
  left join lateral (
    select sum(rl.quantity) quantity from reverse_logistics.return_lines rl
    join reverse_logistics.return_requests rr on rr.id=rl.return_request_id
    where rl.order_line_id=ol.id and rr.current_state_key not in('rejected','withdrawn','cancelled')
  ) requested on true where ol.order_id=o.id),'[]'::jsonb)
) end
from sales.orders o
join sales.order_addresses a on a.order_id=o.id
join lateral(select occurred_at from sales.order_transitions where order_id=o.id and to_state_key='delivered' order by sequence_number limit 1)delivered on true
where o.external_reference=upper(btrim(p_order_reference))
and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g')
and o.current_state_key in('delivered','completed')
and statement_timestamp()<=delivered.occurred_at+interval'7 days';$$;

create or replace function public.customer_request_return(
  p_order_reference text,p_phone text,p_order_line_id uuid,p_quantity numeric,
  p_reason text,p_condition text,p_note text,p_photo_reference text default null,p_video_reference text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare o sales.orders%rowtype;ol sales.order_lines%rowtype;delivered_at timestamptz;
  already_requested numeric;request_id uuid;returnable boolean;exception_reason boolean;
begin
  if p_reason not in('wrong-product','damaged','defective','missing-item','not-as-described','changed-mind','other') then raise exception 'Select an approved return reason.';end if;
  if p_condition not in('unopened-unused','opened-used','not-received') then raise exception 'Select the product condition.';end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Return quantity must be positive.';end if;
  if nullif(btrim(p_note),'')is null then raise exception 'Return details are required.';end if;
  exception_reason:=p_reason in('wrong-product','damaged','defective','missing-item');
  if exception_reason and nullif(btrim(p_photo_reference),'')is null then raise exception 'Photo evidence is required for this reason.';end if;
  select orders.* into o from sales.orders orders join sales.order_addresses a on a.order_id=orders.id
   where orders.external_reference=upper(btrim(p_order_reference)) and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g') for update of orders;
  if o.id is null then raise exception 'Order details could not be verified.';end if;
  if o.current_state_key not in('delivered','completed')then raise exception 'This order is not eligible for a normal return.';end if;
  select occurred_at into delivered_at from sales.order_transitions where order_id=o.id and to_state_key='delivered'order by sequence_number limit 1;
  if delivered_at is null or statement_timestamp()>delivered_at+interval'7 days'then raise exception 'The seven-day return window has closed.';end if;
  select * into ol from sales.order_lines where id=p_order_line_id and order_id=o.id for update;
  if ol.id is null then raise exception 'Order item could not be verified.';end if;
  select coalesce(p.is_returnable,false)into returnable from catalog.variants v join catalog.products p on p.id=v.product_id where v.id=ol.catalog_variant_id;
  if not exception_reason and not returnable then raise exception 'This product is not normally returnable.';end if;
  if p_condition='opened-used'and not exception_reason then raise exception 'Opened hygiene-sensitive products are not normally returnable.';end if;
  select coalesce(sum(rl.quantity),0)into already_requested from reverse_logistics.return_lines rl join reverse_logistics.return_requests rr on rr.id=rl.return_request_id where rl.order_line_id=ol.id and rr.current_state_key not in('rejected','withdrawn','cancelled');
  if already_requested+p_quantity>ol.quantity then raise exception 'Return quantity exceeds the remaining eligible quantity.';end if;
  insert into reverse_logistics.return_requests(order_id,reason_key,condition_key,shipping_responsibility_key,customer_note)
  values(o.id,p_reason,p_condition,case when exception_reason then'reyon'when p_reason='changed-mind'then'customer'else'review-required'end,btrim(p_note))returning id into request_id;
  insert into reverse_logistics.return_lines(return_request_id,order_line_id,quantity)values(request_id,ol.id,p_quantity);
  if nullif(btrim(p_photo_reference),'')is not null then insert into reverse_logistics.return_evidence(return_request_id,evidence_kind,asset_reference)values(request_id,'photo',btrim(p_photo_reference));end if;
  if nullif(btrim(p_video_reference),'')is not null then insert into reverse_logistics.return_evidence(return_request_id,evidence_kind,asset_reference)values(request_id,'video',btrim(p_video_reference));end if;
  insert into reverse_logistics.return_events(return_request_id,sequence_number,to_state_key,actor_role_key,reason_note)values(request_id,1,'requested','customer','Customer return request');
  insert into notifications.outbox(event_key,audience_key,order_id,payload)values
   ('return-requested','customer',o.id,jsonb_build_object('returnRequestId',request_id)),
   ('return-requested','admin',o.id,jsonb_build_object('returnRequestId',request_id));
  return request_id;
end$$;

create or replace function public.admin_return_queue()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object(
 'id',rr.id,'orderNumber',o.external_reference,'state',rr.current_state_key,'reason',rr.reason_key,
 'condition',rr.condition_key,'shippingResponsibility',rr.shipping_responsibility_key,'note',rr.customer_note,
 'requestedAt',rr.requested_at,'lineNumber',ol.line_number,'productName',ol.product_name_snapshot,
 'variantLabel',ol.variant_label_snapshot,'quantity',rl.quantity,
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('kind',e.evidence_kind,'reference',e.asset_reference)),'[]'::jsonb)from reverse_logistics.return_evidence e where e.return_request_id=rr.id)
)order by rr.requested_at),'[]'::jsonb)else null end
from reverse_logistics.return_requests rr join sales.orders o on o.id=rr.order_id
join reverse_logistics.return_lines rl on rl.return_request_id=rr.id join sales.order_lines ol on ol.id=rl.order_line_id
where rr.current_state_key not in('refunded','rejected','withdrawn','cancelled');$$;

revoke all on function public.customer_return_eligible_lines(text,text),public.customer_request_return(text,text,uuid,numeric,text,text,text,text,text)from public;
grant execute on function public.customer_return_eligible_lines(text,text),public.customer_request_return(text,text,uuid,numeric,text,text,text,text,text)to anon,authenticated;
revoke all on function public.admin_return_queue()from public,anon;
grant execute on function public.admin_return_queue()to authenticated;
