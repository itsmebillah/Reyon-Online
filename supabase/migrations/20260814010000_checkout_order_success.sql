-- Token-scoped, read-only customer confirmation for an already-created order.
create or replace function public.checkout_order_success(p_access_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'orderReference', o.external_reference,
    'status', o.current_state_key,
    'paymentMethod', op.method_name_snapshot,
    'totalAmount', o.total_amount,
    'currency', o.currency_code,
    'deliveryZone', od.zone_name_snapshot,
    'address', jsonb_build_object(
      'fullName', oa.full_name,
      'phone', oa.phone,
      'flatNo', oa.flat_no,
      'houseNo', oa.house_no,
      'road', oa.road,
      'villageCity', oa.village_city,
      'thanaUpazila', oa.thana_upazila,
      'district', oa.district,
      'division', oa.division
    )
  )
  from commerce.carts c
  join commerce.cart_orders co on co.cart_id = c.id
  join sales.orders o on o.id = co.order_id
  join sales.order_addresses oa on oa.order_id = o.id
  join sales.order_delivery_details od on od.order_id = o.id
  join sales.order_payment_details op on op.order_id = o.id
  where c.access_token = p_access_token
    and c.expires_at > statement_timestamp();
$$;

revoke all on function public.checkout_order_success(uuid) from public;
grant execute on function public.checkout_order_success(uuid) to anon, authenticated;

comment on function public.checkout_order_success(uuid) is
  'Reads the persisted order confirmation belonging to a private active cart token; never creates or mutates an order.';
