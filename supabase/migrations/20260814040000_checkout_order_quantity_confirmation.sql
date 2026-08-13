-- Expose persisted order lines to the owning checkout token for confirmation.
create or replace function public.checkout_order_success(p_access_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orderReference',o.external_reference,'status',o.current_state_key,'paymentMethod',op.method_name_snapshot,
    'totalAmount',o.total_amount,'currency',o.currency_code,'deliveryZone',od.zone_name_snapshot,
    'address',jsonb_build_object('fullName',oa.full_name,'phone',oa.phone,'flatNo',oa.flat_no,'houseNo',oa.house_no,
      'road',oa.road,'villageCity',oa.village_city,'thanaUpazila',oa.thana_upazila,'district',oa.district,'division',oa.division),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('name',ol.product_name_snapshot,'variant',ol.variant_label_snapshot,
      'quantity',ol.quantity,'unitPrice',ol.unit_price_amount,'lineTotal',ol.quantity*ol.unit_price_amount) order by ol.line_number),'[]'::jsonb)
      from sales.order_lines ol where ol.order_id=o.id)
  ) from commerce.carts c join commerce.cart_orders co on co.cart_id=c.id join sales.orders o on o.id=co.order_id
  join sales.order_addresses oa on oa.order_id=o.id join sales.order_delivery_details od on od.order_id=o.id
  join sales.order_payment_details op on op.order_id=o.id
  where c.access_token=p_access_token and c.expires_at>statement_timestamp();
$$;
revoke all on function public.checkout_order_success(uuid) from public;
grant execute on function public.checkout_order_success(uuid) to anon,authenticated;
