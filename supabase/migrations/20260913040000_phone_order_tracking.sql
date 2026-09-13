create or replace function public.customer_orders_by_phone(p_phone text)
returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(result order by result->>'occurredAt' desc), '[]'::jsonb)
from (
  select jsonb_build_object('orderNumber',o.external_reference,'status',s.display_name,'shipmentReference',r.external_reference,'updatedAt',latest.occurred_at,'occurredAt',o.occurred_at) result
  from sales.orders o join sales.order_addresses a on a.order_id=o.id join fulfillment.fulfillments f on f.order_id=o.id join fulfillment.delivery_states s on s.state_key=f.current_state_key
  left join lateral (select external_reference from fulfillment.delivery_references where fulfillment_id=f.id and reference_type_key='shipment' order by created_at desc limit 1) r on true
  left join lateral (select occurred_at from fulfillment.fulfillment_transitions where fulfillment_id=f.id order by sequence_number desc limit 1) latest on true
  where regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g') order by o.occurred_at desc limit 20
) tracked;
$$;
revoke all on function public.customer_orders_by_phone(text) from public;
grant execute on function public.customer_orders_by_phone(text) to anon, authenticated;
