-- REYON Business OS: guarded append-only Order Management transitions.

create table sales.delivery_handoff_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  evidence_reference text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  recorded_by uuid not null,
  constraint delivery_handoff_reference_present check(btrim(evidence_reference) <> ''),
  constraint delivery_handoff_order_unique unique(order_id)
);
alter table sales.delivery_handoff_evidence enable row level security;
revoke all on sales.delivery_handoff_evidence from public,anon,authenticated;
grant all on sales.delivery_handoff_evidence to service_role;

create table sales.order_transition_notes (
  transition_id uuid primary key references sales.order_transitions(id) on delete restrict,
  note text not null,
  is_internal boolean not null default true,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint order_transition_note_present check(btrim(note) <> '')
);
alter table sales.order_transition_notes enable row level security;
revoke all on sales.order_transition_notes from public,anon,authenticated;
grant all on sales.order_transition_notes to service_role;

create or replace function public.admin_transition_order(
  p_order_id uuid,p_target_state text,p_reason text default null,p_handoff_reference text default null
) returns void language plpgsql security definer set search_path='' as $$
declare o sales.orders%rowtype;rule sales.order_transition_rules%rowtype;role_key text;next_sequence integer;payment_kind text;payment_state text;transition_id uuid;
begin
  role_key:=public.reyon_admin_role();
  if role_key is null then raise exception 'Administrator access required.';end if;
  select * into o from sales.orders where id=p_order_id for update;
  if o.id is null then raise exception 'Order not found.';end if;
  select * into rule from sales.order_transition_rules where from_state_key=o.current_state_key and to_state_key=p_target_state;
  if rule.from_state_key is null then raise exception 'This lifecycle transition is not allowed.';end if;
  if p_target_state in('cancelled','rejected') and role_key='staff' then raise exception 'Admin role required for cancellation or rejection.';end if;
  if rule.requires_reason and nullif(btrim(p_reason),'') is null then raise exception 'A reason is required.';end if;
  if rule.requires_delivery_handoff and nullif(btrim(p_handoff_reference),'') is null then raise exception 'Delivery handoff evidence is required.';end if;
  select method_kind_snapshot,evidence_state_key into payment_kind,payment_state from sales.order_payment_details where order_id=o.id;
  if p_target_state in('processing','packed','shipped') and payment_kind<>'cod' and payment_state<>'verified' then raise exception 'Manual payment must be verified before processing.';end if;
  if o.current_state_key='confirmed' and p_target_state='processing' and not exists(select 1 from inventory.reservations where order_id=o.id and released_at is null and expires_at>statement_timestamp()) then raise exception 'An active stock reservation is required.';end if;
  if rule.requires_delivery_handoff then
    insert into sales.delivery_handoff_evidence(order_id,evidence_reference,recorded_by) values(o.id,btrim(p_handoff_reference),auth.uid());
  end if;
  select coalesce(max(sequence_number),0)+1 into next_sequence from sales.order_transitions where order_id=o.id;
  update sales.orders set current_state_key=p_target_state where id=o.id;
  insert into sales.order_transitions(order_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,reason_key,rule_version,idempotency_key)
  values(o.id,next_sequence,o.current_state_key,p_target_state,statement_timestamp(),auth.uid(),case when nullif(btrim(p_reason),'') is null then null else 'admin-action' end,'sprint-16-v1','admin-transition:'||o.id::text||':'||next_sequence::text) returning id into transition_id;
  if nullif(btrim(p_reason),'') is not null then insert into sales.order_transition_notes(transition_id,note)values(transition_id,btrim(p_reason));end if;
  if p_target_state in('cancelled','rejected','failed','returned') then
    with released as(update inventory.reservations set released_at=statement_timestamp() where order_id=o.id and released_at is null returning id)
    insert into inventory.reservation_events(reservation_id,event_type_key,actor_id,reason) select id,'released',auth.uid(),coalesce(nullif(btrim(p_reason),''),'Order left active fulfillment') from released;
  end if;
end$$;
revoke all on function public.admin_transition_order(uuid,text,text,text) from public,anon;
grant execute on function public.admin_transition_order(uuid,text,text,text) to authenticated;

create or replace function public.admin_order_detail(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
select case when public.is_reyon_admin() then jsonb_build_object(
 'id',o.id,'orderNumber',o.external_reference,'state',o.current_state_key,'occurredAt',o.occurred_at,
 'subtotal',o.subtotal_amount,'deliveryAmount',o.delivery_amount,'total',o.total_amount,'currency',o.currency_code,
 'address',to_jsonb(a),'delivery',to_jsonb(d),'payment',to_jsonb(p),
 'lines',(select coalesce(jsonb_agg(to_jsonb(ol) order by line_number),'[]'::jsonb)from sales.order_lines ol where ol.order_id=o.id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('sequence',t.sequence_number,'from',t.from_state_key,'to',t.to_state_key,'occurredAt',t.occurred_at,'reason',n.note)order by t.sequence_number),'[]'::jsonb)from sales.order_transitions t left join sales.order_transition_notes n on n.transition_id=t.id where t.order_id=o.id),
 'allowedTransitions',(select coalesce(jsonb_agg(jsonb_build_object('key',s.state_key,'name',s.display_name,'requiresReason',r.requires_reason,'requiresHandoff',r.requires_delivery_handoff)order by s.display_order),'[]'::jsonb)from sales.order_transition_rules r join sales.order_states s on s.state_key=r.to_state_key where r.from_state_key=o.current_state_key)
)else null end from sales.orders o left join sales.order_addresses a on a.order_id=o.id left join sales.order_delivery_details d on d.order_id=o.id left join sales.order_payment_details p on p.order_id=o.id where o.id=p_order_id;
$$;
revoke all on function public.admin_order_detail(uuid) from public,anon;
grant execute on function public.admin_order_detail(uuid) to authenticated;
