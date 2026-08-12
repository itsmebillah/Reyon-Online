-- REYON Business OS: reservation expiry moves active orders to reviewable exception.
create or replace function inventory.release_expired_reservations()returns integer language plpgsql security definer set search_path=''as $$declare released_count integer;affected_order record;next_sequence integer;begin
  create temporary table if not exists expired_order_reservations(reservation_id uuid,order_id uuid)on commit drop;truncate expired_order_reservations;
  insert into expired_order_reservations select id,order_id from inventory.reservations where released_at is null and expires_at<=statement_timestamp()for update;
  update inventory.reservations r set released_at=statement_timestamp()from expired_order_reservations e where r.id=e.reservation_id;
  insert into inventory.reservation_events(reservation_id,event_type_key,reason)select reservation_id,'expired','The approved 30-minute reservation window elapsed'from expired_order_reservations;
  for affected_order in select distinct order_id from expired_order_reservations where order_id is not null loop
    if exists(select 1 from sales.orders where id=affected_order.order_id and current_state_key='confirmed')then
      select coalesce(max(sequence_number),0)+1 into next_sequence from sales.order_transitions where order_id=affected_order.order_id;
      update sales.orders set current_state_key='reservation-exception'where id=affected_order.order_id;
      insert into sales.order_transitions(order_id,sequence_number,from_state_key,to_state_key,occurred_at,reason_key,rule_version,idempotency_key)values(affected_order.order_id,next_sequence,'confirmed','reservation-exception',statement_timestamp(),'reservation-expired','sprint-16-v1','reservation-expired:'||affected_order.order_id::text);
      insert into sales.order_review_cases(order_id,review_type_key,internal_note)values(affected_order.order_id,'stock-exception','30-minute stock reservation expired before processing.')on conflict do nothing;
    end if;
  end loop;
  select count(*)into released_count from expired_order_reservations;return released_count;
end$$;
revoke all on function inventory.release_expired_reservations()from public,anon,authenticated;

create or replace function public.admin_process_expired_reservations()returns integer language plpgsql security definer set search_path=''as $$begin if public.reyon_admin_role()is null then raise exception'Administrator access required.';end if;return inventory.release_expired_reservations();end$$;
revoke all on function public.admin_process_expired_reservations()from public,anon;
grant execute on function public.admin_process_expired_reservations()to authenticated;
