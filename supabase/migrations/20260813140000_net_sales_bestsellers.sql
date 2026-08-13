-- Sprint 19: net sales and net Best Seller projections from completed refunds only.

create or replace function public.admin_daily_sales_reconciliation(p_from date default null,p_to date default null)
returns jsonb language sql stable security definer set search_path=''as $$
select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object(
 'businessDate',d.business_date,'completedSalesCount',d.completed_sales_count,'productSales',d.product_sales,
 'refundedProductRevenue',d.refunded_product_revenue,'netProductSales',d.product_sales-d.refunded_product_revenue,
 'deliveryCharges',d.delivery_charges,'refundedDeliveryCharges',d.refunded_delivery_charges,
 'grandTotal',d.grand_total,'netGrandTotal',d.grand_total-d.refunded_product_revenue-d.refunded_delivery_charges,
 'discounts',d.discounts,'currency',d.currency_code)order by d.business_date desc),'[]'::jsonb)else null end
from(select(cs.completed_at at time zone'Asia/Dhaka')::date business_date,count(*)completed_sales_count,
 sum(cs.product_sales_amount)product_sales,sum(cs.delivery_charge_amount)delivery_charges,sum(cs.grand_total_amount)grand_total,sum(o.discount_amount)discounts,cs.currency_code,
 coalesce(sum(refunds.product_amount),0)refunded_product_revenue,coalesce(sum(refunds.delivery_amount),0)refunded_delivery_charges
 from sales.completed_sales cs join sales.orders o on o.id=cs.order_id
 left join lateral(select sum(r.product_refund_amount)product_amount,sum(r.delivery_refund_amount)delivery_amount from payments.return_refunds r join reverse_logistics.return_requests rr on rr.id=r.return_request_id where rr.order_id=o.id and r.status_key='refunded')refunds on true
 where(p_from is null or(cs.completed_at at time zone'Asia/Dhaka')::date>=p_from)and(p_to is null or(cs.completed_at at time zone'Asia/Dhaka')::date<=p_to)
 group by(cs.completed_at at time zone'Asia/Dhaka')::date,cs.currency_code)d;$$;

create or replace function public.dynamic_collection(p_collection_key text)
returns table(id uuid,slug text,name text,brand_id uuid,brand_slug text,brand_name text,category_id uuid,category_slug text,category_name text,category_display_order integer,variant_label text,sku text,price_amount numeric,compare_at_amount numeric,availability_label text,image_url text,image_alt text,published_at timestamptz)
language sql stable security definer set search_path=''as $$
with configuration as(select*from catalog.product_collections where collection_key=lower(btrim(p_collection_key))and is_enabled),
eligible as(select pc.*,pins.display_order pin_order,
 case when cfg.strategy_key='completed-sales'then coalesce((select sum(ol.quantity)-coalesce(sum(returned.quantity),0)from sales.order_lines ol join sales.completed_sales cs on cs.order_id=ol.order_id left join lateral(select sum(rl.quantity)quantity from reverse_logistics.return_lines rl join reverse_logistics.return_requests rr on rr.id=rl.return_request_id join payments.return_refunds rf on rf.return_request_id=rr.id and rf.status_key='refunded'where rl.order_line_id=ol.id)returned on true where ol.catalog_variant_id in(select v.id from catalog.variants v where v.product_id=pc.id)and(cfg.ranking_period_days is null or cs.completed_at>=statement_timestamp()-make_interval(days=>cfg.ranking_period_days))),0)else 0 end net_sold_quantity
 from public.published_catalog()pc left join configuration cfg on true left join catalog.product_collection_pins pins on pins.collection_id=cfg.id and pins.product_id=pc.id
 where cfg.id is not null and(pins.product_id is not null or cfg.strategy_key='newest-published'or cfg.strategy_key='completed-sales'or(cfg.strategy_key='promotional-price'and exists(select 1 from catalog.variants v join catalog.variant_prices vp on vp.variant_id=v.id and vp.price_type='discount'where v.product_id=pc.id))))
select e.id,e.slug,e.name,e.brand_id,e.brand_slug,e.brand_name,e.category_id,e.category_slug,e.category_name,e.category_display_order,e.variant_label,e.sku,e.price_amount,e.compare_at_amount,e.availability_label,e.image_url,e.image_alt,e.published_at
from eligible e cross join configuration cfg where cfg.strategy_key<>'completed-sales'or e.net_sold_quantity>0
order by(e.pin_order is null),e.pin_order,case when cfg.strategy_key='completed-sales'then e.net_sold_quantity end desc,e.published_at desc,e.id limit(select item_limit from configuration);$$;
