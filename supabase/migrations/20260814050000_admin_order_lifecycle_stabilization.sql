-- REYON Business OS: stabilize Admin Order lifecycle controls without bypassing
-- the Delivery, Returns, Payment, Inventory, or review workflows that own evidence.

create or replace function inventory.reserve_order_after_review(p_order_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_location_id uuid;
  v_line record;
  v_available numeric(20, 6);
  v_reservation_id uuid;
begin
  if exists (
    select 1 from inventory.reservations
    where order_id = p_order_id and released_at is null
      and expires_at > statement_timestamp()
  ) then
    return;
  end if;

  select l.id into v_location_id
  from organization.locations l
  join organization.organizations o on o.id = l.organization_id
  where o.code = 'reyon-online' and l.code = 'main-inventory';

  if v_location_id is null then
    raise exception 'Main Inventory is not configured.';
  end if;

  for v_line in
    select ol.id order_line_id, ol.quantity, si.id stock_item_id
    from sales.order_lines ol
    left join inventory.stock_items si on si.catalog_variant_id = ol.catalog_variant_id
    where ol.order_id = p_order_id
    order by si.id nulls first, ol.line_number
  loop
    if v_line.stock_item_id is null then
      raise exception 'An order line has no inventory stock item.';
    end if;
    perform 1 from inventory.stock_items where id = v_line.stock_item_id for update;
    select coalesce(sp.available, 0) into v_available
    from inventory.stock_position sp
    where sp.stock_item_id = v_line.stock_item_id and sp.location_id = v_location_id;
    if coalesce(v_available, 0) < v_line.quantity then
      raise exception 'Insufficient available stock to confirm this order.';
    end if;
  end loop;

  for v_line in
    select ol.id order_line_id, ol.quantity, si.id stock_item_id
    from sales.order_lines ol
    join inventory.stock_items si on si.catalog_variant_id = ol.catalog_variant_id
    where ol.order_id = p_order_id
    order by ol.line_number
  loop
    v_reservation_id := gen_random_uuid();
    insert into inventory.reservations(
      id, stock_item_id, location_id, quantity, source_namespace,
      source_reference, expires_at, order_id, order_line_id
    ) values (
      v_reservation_id, v_line.stock_item_id, v_location_id, v_line.quantity,
      'order-review', p_order_id::text || ':' || v_line.order_line_id::text,
      statement_timestamp() + interval '30 minutes', p_order_id, v_line.order_line_id
    );
    insert into inventory.reservation_events(
      reservation_id, event_type_key, actor_id, reason
    ) values (
      v_reservation_id, 'created', p_actor,
      'Order reconfirmed after administrative review'
    );
  end loop;
end;
$$;
revoke all on function inventory.reserve_order_after_review(uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_transition_order(
  p_order_id uuid,
  p_target_state text,
  p_reason text default null,
  p_handoff_reference text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  o sales.orders%rowtype;
  rule sales.order_transition_rules%rowtype;
  role_key text;
  next_sequence integer;
  payment_kind text;
  payment_state text;
  transition_id uuid;
  fulfillment_record fulfillment.fulfillments%rowtype;
begin
  role_key := public.reyon_admin_role();
  if role_key is null then raise exception 'Administrator access required.'; end if;

  select * into o from sales.orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found.'; end if;
  select * into rule from sales.order_transition_rules
  where from_state_key = o.current_state_key and to_state_key = p_target_state;
  if rule.from_state_key is null then
    raise exception 'This lifecycle transition is not allowed from the current server state.';
  end if;
  if p_target_state in ('cancelled', 'rejected') and role_key = 'staff' then
    raise exception 'Admin role required for cancellation or rejection.';
  end if;
  if rule.requires_reason and nullif(btrim(p_reason), '') is null then
    raise exception 'A reason is required.';
  end if;

  select * into fulfillment_record from fulfillment.fulfillments
  where order_id = o.id for update;

  -- Shipment, delivery, and return states may only be reached through their
  -- evidence-owning workflows. This blocks the generic Order form and direct RPC
  -- calls from bypassing pickup, POD, COD, exception, or return evidence.
  if p_target_state = 'shipped' and (
    fulfillment_record.id is null
    or fulfillment_record.current_state_key <> 'courier-assigned'
    or not exists (
      select 1 from fulfillment.handoff_evidence h
      where h.fulfillment_id = fulfillment_record.id
    )
  ) then
    raise exception 'Record courier pickup and handoff evidence in Delivery Operations.';
  end if;
  if p_target_state = 'delivered' and (
    fulfillment_record.id is null
    or fulfillment_record.current_state_key <> 'delivered'
    or not exists (
      select 1 from fulfillment.proof_of_delivery pod
      where pod.fulfillment_id = fulfillment_record.id
    )
  ) then
    raise exception 'Proof of Delivery is required in Delivery Operations.';
  end if;
  if p_target_state = 'failed' and not exists (
    select 1 from fulfillment.delivery_exceptions de
    where de.fulfillment_id = fulfillment_record.id
      and de.exception_state_key in ('delivery-failed', 'lost', 'damaged')
  ) then
    raise exception 'Record the delivery exception in Delivery Operations first.';
  end if;
  if p_target_state = 'returned' and not exists (
    select 1 from reverse_logistics.return_requests rr
    where rr.order_id = o.id and rr.current_state_key in ('received', 'inspected', 'refund-pending', 'refunded')
  ) then
    raise exception 'Use the approved Returns and Refunds workflow.';
  end if;

  if p_target_state in ('cancelled', 'rejected') and fulfillment_record.id is not null then
    if fulfillment_record.current_state_key in ('picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'lost', 'damaged', 'delivery-failed', 'returned') then
      raise exception 'After courier pickup, use the Delivery or Return workflow.';
    end if;
    if fulfillment_record.current_state_key in ('ready-for-dispatch', 'courier-assigned') then
      perform public.admin_record_delivery_exception(
        fulfillment_record.id,
        'delivery-cancelled',
        case when p_target_state = 'cancelled' then 'Order cancelled' else 'Order rejected' end,
        btrim(p_reason)
      );
    end if;
  end if;

  if rule.requires_delivery_handoff and nullif(btrim(p_handoff_reference), '') is null then
    raise exception 'Delivery handoff evidence is required.';
  end if;
  select method_kind_snapshot, evidence_state_key into payment_kind, payment_state
  from sales.order_payment_details where order_id = o.id;
  if p_target_state in ('processing', 'packed', 'shipped')
    and payment_kind <> 'cod' and payment_state <> 'verified' then
    raise exception 'Manual payment must be verified before processing.';
  end if;
  if o.current_state_key = 'confirmed' and p_target_state = 'processing'
    and not exists (
      select 1 from inventory.reservations where order_id = o.id
      and released_at is null and expires_at > statement_timestamp()
    ) then
    raise exception 'An active stock reservation is required.';
  end if;
  if o.current_state_key = 'manual-review' and p_target_state = 'confirmed' then
    perform inventory.reserve_order_after_review(o.id, auth.uid());
  end if;

  if rule.requires_delivery_handoff then
    insert into sales.delivery_handoff_evidence(order_id, evidence_reference, recorded_by)
    values(o.id, btrim(p_handoff_reference), auth.uid()) on conflict (order_id) do nothing;
  end if;
  select coalesce(max(sequence_number), 0) + 1 into next_sequence
  from sales.order_transitions where order_id = o.id;
  update sales.orders set current_state_key = p_target_state where id = o.id;
  insert into sales.order_transitions(
    order_id, sequence_number, from_state_key, to_state_key, occurred_at,
    actor_id, reason_key, rule_version, idempotency_key
  ) values (
    o.id, next_sequence, o.current_state_key, p_target_state, statement_timestamp(),
    auth.uid(), case when nullif(btrim(p_reason), '') is null then null else 'admin-action' end,
    'sprint-16-v2', 'admin-transition:' || o.id::text || ':' || next_sequence::text
  ) returning id into transition_id;
  if nullif(btrim(p_reason), '') is not null then
    insert into sales.order_transition_notes(transition_id, note)
    values(transition_id, btrim(p_reason));
  end if;
  if p_target_state in ('cancelled', 'rejected', 'failed', 'returned') then
    with released as (
      update inventory.reservations set released_at = statement_timestamp()
      where order_id = o.id and released_at is null returning id
    )
    insert into inventory.reservation_events(reservation_id, event_type_key, actor_id, reason)
    select id, 'released', auth.uid(), coalesce(nullif(btrim(p_reason), ''), 'Order left active fulfillment')
    from released;
  end if;
end;
$$;

create or replace function public.admin_resolve_order_review(
  p_case_id uuid, p_resolution text, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  c sales.order_review_cases%rowtype;
  request_id uuid;
  order_state text;
begin
  if public.reyon_admin_role() not in ('super-admin', 'admin') then
    raise exception 'Admin role required.';
  end if;
  if nullif(btrim(p_note), '') is null then
    raise exception 'Resolution note is required.';
  end if;
  select * into c from sales.order_review_cases
  where id = p_case_id and status_key = 'open' for update;
  if c.id is null then raise exception 'Open review case not found.'; end if;
  select current_state_key into order_state from sales.orders where id = c.order_id for update;

  if c.review_type_key = 'cancellation-request' then
    if p_resolution not in ('approved', 'declined') then
      raise exception 'Cancellation review requires Approve or Decline.';
    end if;
    select id into request_id from sales.order_cancellation_requests
    where order_id = c.order_id and resolved_at is null for update;
    if request_id is null then raise exception 'Open cancellation request not found.'; end if;
    if p_resolution = 'approved' then
      perform public.admin_transition_order(c.order_id, 'cancelled', p_note, null);
    end if;
    update sales.order_cancellation_requests
    set resolved_at = statement_timestamp(), resolution_key = p_resolution, resolved_by = auth.uid()
    where id = request_id;
  else
    if p_resolution not in ('resolved', 'dismissed') then
      raise exception 'Operational review requires Resolve or Dismiss.';
    end if;
    if p_resolution = 'resolved' and order_state in (
      'confirmation-exception', 'payment-exception', 'reservation-exception'
    ) then
      perform public.admin_transition_order(c.order_id, 'manual-review', p_note, null);
    end if;
  end if;

  update sales.order_review_cases
  set status_key = case when p_resolution = 'dismissed' then 'dismissed' else 'resolved' end,
      resolved_at = statement_timestamp(), resolved_by = auth.uid(), resolution_note = btrim(p_note)
  where id = c.id;
end;
$$;

create or replace function public.admin_order_detail(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
select case when public.is_reyon_admin() then jsonb_build_object(
  'id', o.id, 'orderNumber', o.external_reference, 'state', o.current_state_key,
  'occurredAt', o.occurred_at, 'subtotal', o.subtotal_amount,
  'deliveryAmount', o.delivery_amount, 'total', o.total_amount, 'currency', o.currency_code,
  'address', to_jsonb(a), 'delivery', to_jsonb(d), 'payment', to_jsonb(p),
  'reservation', jsonb_build_object(
    'status', case
      when exists(select 1 from inventory.reservations r where r.order_id=o.id and r.released_at is null and r.expires_at>statement_timestamp()) then 'active'
      when exists(select 1 from inventory.reservations r where r.order_id=o.id) then 'released-or-expired'
      else 'none' end,
    'expiresAt', (select max(r.expires_at) from inventory.reservations r where r.order_id=o.id and r.released_at is null)
  ),
  'fulfillment', (select jsonb_build_object('id',f.id,'state',f.current_state_key)
    from fulfillment.fulfillments f where f.order_id=o.id),
  'lines', (select coalesce(jsonb_agg(to_jsonb(ol) order by line_number), '[]'::jsonb)
    from sales.order_lines ol where ol.order_id=o.id),
  'history', (select coalesce(jsonb_agg(jsonb_build_object(
    'sequence',t.sequence_number,'from',t.from_state_key,'to',t.to_state_key,
    'occurredAt',t.occurred_at,'reason',n.note) order by t.sequence_number), '[]'::jsonb)
    from sales.order_transitions t left join sales.order_transition_notes n on n.transition_id=t.id
    where t.order_id=o.id),
  'allowedTransitions', (select coalesce(jsonb_agg(jsonb_build_object(
    'key',s.state_key,'name',s.display_name,'requiresReason',r.requires_reason,
    'requiresHandoff',false) order by s.display_order), '[]'::jsonb)
    from sales.order_transition_rules r join sales.order_states s on s.state_key=r.to_state_key
    where r.from_state_key=o.current_state_key
      and (r.from_state_key, r.to_state_key) in (
        ('pending-payment','confirmed'),('pending-payment','cancelled'),('pending-payment','rejected'),('pending-payment','payment-exception'),
        ('confirmed','processing'),('confirmed','cancelled'),('confirmed','rejected'),('confirmed','payment-exception'),('confirmed','reservation-exception'),
        ('processing','packed'),('processing','cancelled'),('processing','rejected'),
        ('packed','cancelled'),('packed','rejected'),
        ('delivered','completed'),
        ('confirmation-exception','manual-review'),('payment-exception','manual-review'),('reservation-exception','manual-review'),
        ('manual-review','confirmed'),('manual-review','rejected')
      )
      and (public.reyon_admin_role() <> 'staff' or r.to_state_key not in ('cancelled','rejected'))
      and not (r.to_state_key in ('cancelled','rejected') and exists (
        select 1 from fulfillment.fulfillments f where f.order_id=o.id
        and f.current_state_key not in ('ready-for-dispatch','courier-assigned')
      ))
  ),
  'workflow', jsonb_build_object(
    'deliveryRequired', o.current_state_key in ('packed','shipped'),
    'returnsRequired', o.current_state_key in ('delivered','completed','returned')
  )
) else null end
from sales.orders o
left join sales.order_addresses a on a.order_id=o.id
left join sales.order_delivery_details d on d.order_id=o.id
left join sales.order_payment_details p on p.order_id=o.id
where o.id=p_order_id;
$$;

-- Ensure newly-created stock exceptions enter the operational queue, not only
-- orders that existed when Sprint 16 was first migrated.
create or replace function sales.ensure_order_exception_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.to_state_key in ('confirmation-exception', 'reservation-exception') then
    insert into sales.order_review_cases(order_id, review_type_key, internal_note, opened_by)
    values(
      new.order_id, 'stock-exception',
      case when new.to_state_key='confirmation-exception'
        then 'Order confirmation detected insufficient stock.'
        else 'The active stock reservation requires administrative review.' end,
      new.actor_id
    ) on conflict do nothing;
  elsif new.to_state_key = 'payment-exception' then
    insert into sales.order_review_cases(order_id, review_type_key, internal_note, opened_by)
    values(new.order_id, 'payment-mismatch', 'Payment evidence requires administrative review.', new.actor_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger order_exception_opens_review
after insert on sales.order_transitions
for each row execute function sales.ensure_order_exception_review();

create or replace function fulfillment.sync_terminal_delivery_exception_to_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid;
  v_order_state text;
begin
  if new.to_state_key not in ('delivery-failed', 'lost', 'damaged') then
    return new;
  end if;
  select f.order_id, o.current_state_key into v_order_id, v_order_state
  from fulfillment.fulfillments f
  join sales.orders o on o.id = f.order_id
  where f.id = new.fulfillment_id;
  if v_order_state = 'shipped' then
    perform public.admin_transition_order(
      v_order_id,
      'failed',
      'Delivery exception: ' || replace(new.to_state_key, '-', ' '),
      null
    );
  end if;
  return new;
end;
$$;
create trigger terminal_delivery_exception_updates_order
after insert on fulfillment.fulfillment_transitions
for each row execute function fulfillment.sync_terminal_delivery_exception_to_order();

notify pgrst, 'reload schema';
