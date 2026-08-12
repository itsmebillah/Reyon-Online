-- REYON Business OS: reporting-oriented daily completed-sales control.

create or replace function public.admin_daily_sales_reconciliation(
  p_from date default null,
  p_to date default null
) returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'businessDate', d.business_date,
    'completedSalesCount', d.completed_sales_count,
    'productSales', d.product_sales,
    'deliveryCharges', d.delivery_charges,
    'grandTotal', d.grand_total,
    'discounts', d.discounts,
    'currency', d.currency_code
  ) order by d.business_date desc), '[]'::jsonb) else null end
  from (
    select (cs.completed_at at time zone 'Asia/Dhaka')::date business_date,
      count(*) completed_sales_count,
      sum(cs.product_sales_amount) product_sales,
      sum(cs.delivery_charge_amount) delivery_charges,
      sum(cs.grand_total_amount) grand_total,
      sum(o.discount_amount) discounts,
      cs.currency_code
    from sales.completed_sales cs join sales.orders o on o.id = cs.order_id
    where (p_from is null or (cs.completed_at at time zone 'Asia/Dhaka')::date >= p_from)
      and (p_to is null or (cs.completed_at at time zone 'Asia/Dhaka')::date <= p_to)
    group by (cs.completed_at at time zone 'Asia/Dhaka')::date, cs.currency_code
  ) d;
$$;

revoke all on function public.admin_daily_sales_reconciliation(date, date) from public, anon;
grant execute on function public.admin_daily_sales_reconciliation(date, date) to authenticated;

comment on function public.admin_daily_sales_reconciliation(date, date) is
  'Operational daily control from immutable Completed-sale facts; no POS opening/closing or accounting posting is implied.';
