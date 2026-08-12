-- REYON Business OS: Sprint 16 cancellation requests and private review queues.

create table sales.order_cancellation_requests(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  reason text not null,
  requested_at timestamptz not null default statement_timestamp(),
  resolved_at timestamptz,
  resolution_key text check(resolution_key in('approved','declined')),
  resolved_by uuid,
  constraint cancellation_reason_present check(btrim(reason)<>''),
  constraint cancellation_resolution_consistent check((resolved_at is null and resolution_key is null and resolved_by is null)or(resolved_at is not null and resolution_key is not null and resolved_by is not null))
);
create unique index cancellation_request_open_order_unique on sales.order_cancellation_requests(order_id)where resolved_at is null;

create table sales.order_review_cases(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  review_type_key text not null check(review_type_key in('payment-mismatch','stock-exception','suspicious-order','delivery-address-exception','configured-risk','cancellation-request')),
  status_key text not null default 'open' check(status_key in('open','resolved','dismissed')),
  internal_note text,
  opened_at timestamptz not null default statement_timestamp(),
  opened_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  constraint review_internal_note_present check(internal_note is null or btrim(internal_note)<>''),
  constraint review_resolution_note_present check(resolution_note is null or btrim(resolution_note)<>'')
);
create unique index review_case_open_type_unique on sales.order_review_cases(order_id,review_type_key)where status_key='open';

create trigger cancellation_requests_prevent_mutation before delete on sales.order_cancellation_requests for each row execute function sales.prevent_transition_mutation();
create trigger review_cases_prevent_delete before delete on sales.order_review_cases for each row execute function sales.prevent_transition_mutation();
alter table sales.order_cancellation_requests enable row level security;
alter table sales.order_review_cases enable row level security;
revoke all on sales.order_cancellation_requests,sales.order_review_cases from public,anon,authenticated;
grant all on sales.order_cancellation_requests,sales.order_review_cases to service_role;

insert into sales.order_review_cases(order_id,review_type_key,internal_note)
select id,'stock-exception','Order confirmation detected insufficient stock.' from sales.orders where current_state_key='confirmation-exception'
on conflict do nothing;

create or replace function public.request_order_cancellation(p_order_reference text,p_phone text,p_reason text)returns void
language plpgsql security definer set search_path='' as $$declare found_order sales.orders%rowtype;begin
  if nullif(btrim(p_reason),'')is null then raise exception'Cancellation reason is required.';end if;
  select o.* into found_order from sales.orders o join sales.order_addresses a on a.order_id=o.id
  where o.external_reference=upper(btrim(p_order_reference))and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g');
  if found_order.id is null then raise exception'Order details could not be verified.';end if;
  if found_order.current_state_key in('shipped','delivered','completed','returned','cancelled','rejected','failed')then raise exception'This order can no longer be cancelled; use the return workflow after shipment.';end if;
  insert into sales.order_cancellation_requests(order_id,reason)values(found_order.id,btrim(p_reason));
  insert into sales.order_review_cases(order_id,review_type_key,internal_note)values(found_order.id,'cancellation-request','Customer cancellation request requires review')on conflict do nothing;
end$$;
revoke all on function public.request_order_cancellation(text,text,text)from public;
grant execute on function public.request_order_cancellation(text,text,text)to anon,authenticated;

create or replace function public.admin_order_review_queue()returns jsonb language sql stable security definer set search_path='' as $$
select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object('id',c.id,'orderId',o.id,'orderNumber',o.external_reference,'orderState',o.current_state_key,'type',c.review_type_key,'status',c.status_key,'internalNote',c.internal_note,'openedAt',c.opened_at,'customerName',a.full_name,'cancellationReason',r.reason)order by c.opened_at),'[]'::jsonb)else null end
from sales.order_review_cases c join sales.orders o on o.id=c.order_id left join sales.order_addresses a on a.order_id=o.id left join sales.order_cancellation_requests r on r.order_id=o.id and r.resolved_at is null where c.status_key='open';$$;
revoke all on function public.admin_order_review_queue()from public,anon;
grant execute on function public.admin_order_review_queue()to authenticated;

create or replace function public.admin_resolve_order_review(p_case_id uuid,p_resolution text,p_note text)returns void language plpgsql security definer set search_path='' as $$declare c sales.order_review_cases%rowtype;request_id uuid;begin
  if public.reyon_admin_role()not in('super-admin','admin')then raise exception'Admin role required.';end if;
  if p_resolution not in('approved','declined','resolved','dismissed')then raise exception'Invalid review resolution.';end if;
  if nullif(btrim(p_note),'')is null then raise exception'Resolution note is required.';end if;
  select*into c from sales.order_review_cases where id=p_case_id and status_key='open'for update;if c.id is null then raise exception'Open review case not found.';end if;
  if c.review_type_key='cancellation-request'then
    select id into request_id from sales.order_cancellation_requests where order_id=c.order_id and resolved_at is null for update;
    if p_resolution not in('approved','declined')then raise exception'Cancellation review requires approved or declined.';end if;
    if p_resolution='approved'then perform public.admin_transition_order(c.order_id,'cancelled',p_note,null);end if;
    update sales.order_cancellation_requests set resolved_at=statement_timestamp(),resolution_key=p_resolution,resolved_by=auth.uid()where id=request_id;
  end if;
  update sales.order_review_cases set status_key=case when p_resolution='dismissed'then'dismissed'else'resolved'end,resolved_at=statement_timestamp(),resolved_by=auth.uid(),resolution_note=btrim(p_note)where id=c.id;
end$$;
revoke all on function public.admin_resolve_order_review(uuid,text,text)from public,anon;
grant execute on function public.admin_resolve_order_review(uuid,text,text)to authenticated;
