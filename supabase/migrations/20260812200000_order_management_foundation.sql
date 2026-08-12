-- REYON Business OS: Sprint 16 Order Management reference, lifecycle, role,
-- and secure administration read-model foundation.

alter table access.admin_memberships
  add column role_key text not null default 'super-admin',
  add constraint admin_memberships_role_approved
    check (role_key in ('super-admin', 'admin', 'staff'));

comment on column access.admin_memberships.role_key is
  'Initial extensible Order Management roles: Super Admin, Admin, and Staff.';

create or replace function public.reyon_admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select role_key from access.admin_memberships
  where user_id = auth.uid() and revoked_at is null;
$$;
revoke all on function public.reyon_admin_role() from public, anon;
grant execute on function public.reyon_admin_role() to authenticated;

create sequence sales.order_reference_sequence;

with numbered as (
  select id, extract(year from occurred_at at time zone 'Asia/Dhaka')::integer as order_year,
    row_number() over(order by occurred_at, id) as reference_number
  from sales.orders
)
update sales.orders o set external_reference =
  'RYN-' || n.order_year::text || '-' || lpad(n.reference_number::text, 6, '0')
from numbered n where n.id = o.id and o.external_reference is null;

select setval('sales.order_reference_sequence',
  greatest((select count(*) from sales.orders), 1),
  (select count(*) from sales.orders) > 0);

create unique index orders_global_external_reference_unique
  on sales.orders(external_reference) where external_reference is not null;

create or replace function sales.assign_order_reference()
returns trigger language plpgsql set search_path = '' as $$
declare reference_number bigint;
begin
  if tg_op = 'UPDATE' and old.external_reference is distinct from new.external_reference then
    raise exception 'Order reference is immutable.';
  end if;
  if new.external_reference is null then
    reference_number := nextval('sales.order_reference_sequence');
    new.external_reference := 'RYN-'
      || extract(year from new.occurred_at at time zone 'Asia/Dhaka')::integer::text
      || '-' || lpad(reference_number::text, 6, '0');
  end if;
  if new.external_reference !~ '^RYN-[0-9]{4}-[0-9]{6}$' then
    raise exception 'Order reference must use RYN-YYYY-XXXXXX format.';
  end if;
  return new;
end;
$$;

create trigger orders_assign_reference
before insert or update of external_reference on sales.orders
for each row execute function sales.assign_order_reference();

alter table sales.orders
  alter column external_reference set not null,
  add constraint orders_external_reference_format
    check (external_reference ~ '^RYN-[0-9]{4}-[0-9]{6}$');

create table sales.order_states (
  state_key text primary key,
  display_name text not null unique,
  state_kind text not null check (state_kind in ('standard', 'exception', 'terminal')),
  display_order integer not null unique,
  is_customer_visible boolean not null default true
);

insert into sales.order_states(state_key, display_name, state_kind, display_order, is_customer_visible) values
  ('pending-payment', 'Pending Payment', 'standard', 10, true),
  ('confirmed', 'Confirmed', 'standard', 20, true),
  ('processing', 'Processing', 'standard', 30, true),
  ('packed', 'Packed', 'standard', 40, true),
  ('shipped', 'Shipped', 'standard', 50, true),
  ('delivered', 'Delivered', 'standard', 60, true),
  ('completed', 'Completed', 'terminal', 70, true),
  ('cancelled', 'Cancelled', 'terminal', 80, true),
  ('rejected', 'Rejected', 'terminal', 90, true),
  ('failed', 'Failed', 'terminal', 100, true),
  ('returned', 'Returned', 'terminal', 110, true),
  ('payment-exception', 'Payment Exception', 'exception', 120, true),
  ('reservation-exception', 'Reservation Exception', 'exception', 130, true),
  ('confirmation-exception', 'Confirmation Exception', 'exception', 140, true),
  ('manual-review', 'Manual Review', 'exception', 150, false);

create table sales.order_transition_rules (
  from_state_key text not null references sales.order_states(state_key),
  to_state_key text not null references sales.order_states(state_key),
  requires_reason boolean not null default false,
  requires_delivery_handoff boolean not null default false,
  primary key(from_state_key, to_state_key),
  constraint order_transition_rule_changes_state check(from_state_key <> to_state_key)
);

insert into sales.order_transition_rules(from_state_key, to_state_key, requires_reason, requires_delivery_handoff) values
  ('pending-payment','confirmed',false,false),
  ('confirmed','processing',false,false),
  ('processing','packed',false,false),
  ('packed','shipped',false,true),
  ('shipped','delivered',false,false),
  ('delivered','completed',false,false),
  ('confirmed','cancelled',true,false),
  ('processing','cancelled',true,false),
  ('packed','cancelled',true,false),
  ('pending-payment','cancelled',true,false),
  ('pending-payment','rejected',true,false),
  ('confirmed','rejected',true,false),
  ('processing','rejected',true,false),
  ('packed','rejected',true,false),
  ('shipped','rejected',true,false),
  ('pending-payment','payment-exception',true,false),
  ('confirmed','payment-exception',true,false),
  ('confirmed','reservation-exception',true,false),
  ('confirmation-exception','manual-review',true,false),
  ('payment-exception','manual-review',true,false),
  ('reservation-exception','manual-review',true,false),
  ('manual-review','confirmed',true,false),
  ('manual-review','rejected',true,false),
  ('shipped','failed',true,false),
  ('delivered','returned',true,false),
  ('completed','returned',true,false);

alter table sales.order_states enable row level security;
alter table sales.order_transition_rules enable row level security;
revoke all on sales.order_states, sales.order_transition_rules from public, anon, authenticated;
grant all on sales.order_states, sales.order_transition_rules to service_role;
grant usage, select on sequence sales.order_reference_sequence to service_role;

create or replace function public.admin_orders(
  p_query text default null,
  p_state text default null
) returns jsonb language sql stable security definer set search_path = '' as $$
select case when public.is_reyon_admin() then coalesce(jsonb_agg(row_data order by occurred_at desc), '[]'::jsonb) else null end
from (
  select jsonb_build_object(
    'id', o.id, 'orderNumber', o.external_reference, 'state', o.current_state_key,
    'occurredAt', o.occurred_at, 'updatedAt', o.updated_at,
    'customerName', oa.full_name, 'phone', oa.phone,
    'total', o.total_amount, 'currency', o.currency_code,
    'paymentMethod', opd.method_name_snapshot, 'paymentState', opd.evidence_state_key,
    'deliveryZone', odd.zone_name_snapshot,
    'lineCount', (select count(*) from sales.order_lines ol where ol.order_id=o.id),
    'reservationExpiresAt', (select max(r.expires_at) from inventory.reservations r where r.order_id=o.id and r.released_at is null)
  ) row_data, o.occurred_at
  from sales.orders o
  left join sales.order_addresses oa on oa.order_id=o.id
  left join sales.order_payment_details opd on opd.order_id=o.id
  left join sales.order_delivery_details odd on odd.order_id=o.id
  where (nullif(btrim(p_query),'') is null or o.external_reference ilike '%'||btrim(p_query)||'%' or oa.full_name ilike '%'||btrim(p_query)||'%' or oa.phone ilike '%'||btrim(p_query)||'%')
    and (nullif(btrim(p_state),'') is null or o.current_state_key=p_state)
) orders;
$$;

create or replace function public.admin_order_states()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'key', state_key, 'name', display_name, 'kind', state_kind
  ) order by display_order), '[]'::jsonb) else null end from sales.order_states;
$$;

revoke all on function public.admin_orders(text,text) from public, anon;
revoke all on function public.admin_order_states() from public, anon;
grant execute on function public.admin_orders(text,text) to authenticated;
grant execute on function public.admin_order_states() to authenticated;

comment on table sales.order_states is 'Approved Sprint 16 order state vocabulary.';
comment on table sales.order_transition_rules is 'Approved transition graph; command-level evidence and permissions remain enforced separately.';
