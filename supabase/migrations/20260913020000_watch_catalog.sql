-- Watch facts opt products into the new storefront. Existing cosmetics records,
-- SKUs and all operational history remain intact and accessible to administrators.
create table catalog.watch_details (
 product_id uuid primary key references catalog.products(id) on delete restrict,
 specifications jsonb not null default '{}', description text not null default '',
 updated_at timestamptz not null default statement_timestamp(),
 check (jsonb_typeof(specifications)='object'), check(length(description)<=10000)
);
alter table catalog.watch_details enable row level security;
revoke all on catalog.watch_details from public,anon,authenticated;
grant all on catalog.watch_details to service_role;
create index watch_gender_idx on catalog.watch_details ((specifications->>'gender'));
create index watch_movement_idx on catalog.watch_details ((specifications->>'movement'));
create index watch_strap_idx on catalog.watch_details ((specifications->>'strapMaterial'));
create index watch_offer_price_idx on catalog.offers (channel_key,price_amount,variant_id);
create index product_published_updated_idx on catalog.products (updated_at desc,id) where status='published';

insert into catalog.categories(slug,name,display_order) values
 ('classic-watches','Classic & formal',1),('casual-watches','Everyday watches',2),('sports-watches','Sport & adventure',3)
on conflict(slug) do nothing;

create function public.admin_save_watch_details(p_product_id uuid,p_specifications jsonb,p_description text)
returns void language plpgsql security definer set search_path='' as $$
declare k text; v jsonb;
begin
 if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
 if jsonb_typeof(p_specifications) is distinct from 'object' then raise exception 'Watch specifications must be an object.'; end if;
 for k,v in select * from jsonb_each(p_specifications) loop
  if k not in ('model','gender','movement','display','dialColor','caseColor','caseMaterial','strapMaterial','strapColor','caseSize','waterResistance','warranty')
    or jsonb_typeof(v)<>'string' or length(v#>>'{}')>1000 then raise exception 'Invalid watch specification.'; end if;
 end loop;
 if nullif(btrim(p_specifications->>'model'),'') is null then raise exception 'Watch model is required.'; end if;
 if coalesce(p_specifications->>'gender','') not in ('men','women','unisex') then raise exception 'Select a watch audience.'; end if;
 if not exists(select 1 from catalog.product_categories pc join catalog.categories c on c.id=pc.category_id where pc.product_id=p_product_id and c.slug in ('classic-watches','casual-watches','sports-watches')) then raise exception 'Select a watch category.';end if;
 insert into catalog.watch_details(product_id,specifications,description) values(p_product_id,p_specifications,coalesce(p_description,''))
 on conflict(product_id) do update set specifications=excluded.specifications,description=excluded.description,updated_at=statement_timestamp();
end $$;
revoke all on function public.admin_save_watch_details(uuid,jsonb,text) from public,anon;
grant execute on function public.admin_save_watch_details(uuid,jsonb,text) to authenticated;

create function public.admin_create_watch(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
 if (p_data->>'p_selling_price')::numeric is null or (p_data->>'p_selling_price')::numeric<=0 or coalesce((p_data->>'p_discount_price')::numeric,1)<=0 then raise exception 'A positive watch price is required.';end if;
 if (p_data->>'p_discount_price')::numeric>(p_data->>'p_selling_price')::numeric then raise exception 'Discount price cannot exceed selling price.';end if;
 pid:=public.admin_create_product_with_asset(p_data->>'p_name',p_data->>'p_slug',(p_data->>'p_brand_id')::uuid,(p_data->>'p_category_id')::uuid,
 'color',p_data->>'p_variant_label',p_data->>'p_sku',p_data->>'p_barcode',(p_data->>'p_purchase_price')::numeric,
 (p_data->>'p_selling_price')::numeric,(p_data->>'p_compare_at_price')::numeric,(p_data->>'p_discount_price')::numeric,
 (p_data->>'p_asset_id')::uuid,p_data->>'p_image_alt',p_data->>'p_country_code',p_data->>'p_product_code',false);
 perform public.admin_save_watch_details(pid,p_data->'specifications',p_data->>'description');
 if (p_data->>'p_publish')::boolean then perform public.admin_publish_product(pid);end if;
 return pid;
end $$;
revoke all on function public.admin_create_watch(jsonb) from public,anon;
grant execute on function public.admin_create_watch(jsonb) to authenticated;

create function public.admin_watch_details(p_product_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when public.is_reyon_admin() then jsonb_build_object('specifications',w.specifications,'description',w.description,
 'variants',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'label',v.label,'sku',v.sku,'price',o.price_amount,'compareAtPrice',o.compare_at_amount) order by v.created_at,v.id),'[]') from catalog.variants v left join catalog.offers o on o.variant_id=v.id and o.channel_key='website' where v.product_id=w.product_id)) end
 from catalog.watch_details w where w.product_id=p_product_id;
$$;
revoke all on function public.admin_watch_details(uuid) from public,anon;
grant execute on function public.admin_watch_details(uuid) to authenticated;

create function public.admin_save_watch_variant(p_product_id uuid,p_variant_id uuid,p_label text,p_sku text,p_price numeric,p_compare_at numeric)
returns uuid language plpgsql security definer set search_path='' as $$
declare vid uuid;
begin
 if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
 perform 1 from catalog.products where id=p_product_id for update;
 if not exists(select 1 from catalog.watch_details where product_id=p_product_id) then raise exception 'Watch not found.';end if;
 if p_price is null or p_price<=0 or (p_compare_at is not null and p_compare_at<=p_price) then raise exception 'Enter a positive price and a higher comparison price.';end if;
 if p_variant_id is null then
  insert into catalog.variants(product_id,variant_type,label,sku) values(p_product_id,'color',btrim(p_label),nullif(btrim(p_sku),'')) returning id into vid;
 else
  update catalog.variants set label=btrim(p_label),sku=btrim(p_sku) where id=p_variant_id and product_id=p_product_id returning id into vid;
  if vid is null then raise exception 'Variant not found.';end if;
 end if;
 insert into catalog.offers(variant_id,channel_key,currency_code,price_amount,compare_at_amount) values(vid,'website','BDT',p_price,p_compare_at)
 on conflict(variant_id,channel_key) do update set price_amount=excluded.price_amount,compare_at_amount=excluded.compare_at_amount;
 insert into catalog.variant_prices(variant_id,price_type,currency_code,amount) values(vid,'selling','BDT',p_price)
 on conflict(variant_id,price_type) do update set amount=excluded.amount;
 delete from catalog.variant_prices where variant_id=vid and price_type in ('discount','compare-at');
 if p_compare_at is not null then insert into catalog.variant_prices(variant_id,price_type,currency_code,amount) values(vid,'compare-at','BDT',p_compare_at);end if;
 return vid;
end $$;
revoke all on function public.admin_save_watch_variant(uuid,uuid,text,text,numeric,numeric) from public,anon;
grant execute on function public.admin_save_watch_variant(uuid,uuid,text,text,numeric,numeric) to authenticated;

create function public.watch_categories() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,'displayOrder',display_order) order by display_order),'[]') from catalog.categories
 where slug in ('classic-watches','casual-watches','sports-watches') and is_visible and archived_at is null;
$$;
create function public.watch_brands() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'slug',b.slug,'name',b.name) order by b.name),'[]') from catalog.brands b where b.is_visible and b.archived_at is null
 and exists(select 1 from catalog.products p join catalog.watch_details w on w.product_id=p.id where p.brand_id=b.id and p.status='published');
$$;

create function public.watch_catalog(p_query jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
with candidates as (
 select p.*,w.specifications,w.description,w.updated_at watch_updated,b.name brand_name,b.slug brand_slug,c.id category_id,c.slug category_slug,c.name category_name,c.display_order,
 variants.items,variants.min_price,variants.stock,variants.discounted,
 coalesce((select sum(ol.quantity) from sales.order_lines ol join sales.completed_sales cs on cs.order_id=ol.order_id join catalog.variants v on v.id=ol.catalog_variant_id where v.product_id=p.id),0) -
 coalesce((select sum(rl.quantity) from reverse_logistics.return_lines rl join sales.order_lines ol on ol.id=rl.order_line_id join catalog.variants v on v.id=ol.catalog_variant_id join payments.return_refunds rf on rf.return_request_id=rl.return_request_id and rf.status_key='refunded' where v.product_id=p.id),0) sold
 from catalog.products p join catalog.watch_details w on w.product_id=p.id
 join catalog.brands b on b.id=p.brand_id and b.is_visible and b.archived_at is null
 join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary
 join catalog.categories c on c.id=pc.category_id and c.is_visible and c.archived_at is null
 join lateral (
  select jsonb_agg(jsonb_build_object('id',v.id,'label',v.label,'sku',v.sku,'price',o.price_amount,'compareAtPrice',o.compare_at_amount,'available',greatest(coalesce(stock.available,0),0)) order by o.price_amount,v.id) items,
  min(o.price_amount) min_price,max(coalesce(stock.available,0)) stock,bool_or(o.compare_at_amount>o.price_amount) discounted
  from catalog.variants v join catalog.offers o on o.variant_id=v.id and o.channel_key='website' and o.currency_code='BDT'
  left join lateral (select sp.available from inventory.stock_items si join inventory.stock_position sp on sp.stock_item_id=si.id join organization.locations l on l.id=sp.location_id and l.code='main-inventory' where si.catalog_variant_id=v.id) stock on true
  where v.product_id=p.id
 ) variants on variants.items is not null
 where p.status='published'
 and (nullif(p_query->>'slug','') is null or p.slug=p_query->>'slug')
 and (nullif(p_query->>'category','') is null or c.slug=p_query->>'category')
 and (nullif(p_query->>'brand','') is null or b.slug=p_query->>'brand')
 and (nullif(p_query->>'gender','') is null or w.specifications->>'gender'=p_query->>'gender')
 and (nullif(p_query->>'movement','') is null or lower(w.specifications->>'movement')=lower(p_query->>'movement'))
 and (nullif(p_query->>'strap','') is null or lower(w.specifications->>'strapMaterial')=lower(p_query->>'strap'))
 and (nullif(p_query->>'search','') is null or position(lower(left(p_query->>'search',100)) in lower(p.name||' '||b.name||' '||coalesce(w.specifications->>'model','')))>0)
 and (nullif(p_query->>'min','') is null or variants.min_price>=(p_query->>'min')::numeric)
 and (nullif(p_query->>'max','') is null or variants.min_price<=(p_query->>'max')::numeric)
 and (coalesce((p_query->>'available')::boolean,false)=false or variants.stock>0)
 and (coalesce((p_query->>'offers')::boolean,false)=false or variants.discounted)
), paged as (
 select * from candidates where coalesce(p_query->>'sort','')<>'bestsellers' or sold>0
 order by case when p_query->>'sort'='price-asc' then min_price end asc,
 case when p_query->>'sort'='price-desc' then min_price end desc,
 case when p_query->>'sort'='bestsellers' then sold end desc,created_at desc,id
 limit least(greatest(coalesce((p_query->>'limit')::integer,24),1),100)
 offset (least(greatest(coalesce((p_query->>'page')::integer,1),1),10000)-1)*24
)
select coalesce(jsonb_agg(jsonb_build_object(
 'id',p.id,'slug',p.slug,'name',p.name,'brand',jsonb_build_object('id',p.brand_id,'slug',p.brand_slug,'name',p.brand_name),
 'category',jsonb_build_object('id',p.category_id,'slug',p.category_slug,'name',p.category_name,'displayOrder',p.display_order),
 'variant',p.items->0,'variants',p.items,'specifications',p.specifications,
 'offer',jsonb_build_object('price',jsonb_build_object('amount',p.min_price,'currency','BDT'),'compareAtPrice',case when (p.items->0->>'compareAtPrice')::numeric>p.min_price then jsonb_build_object('amount',(p.items->0->>'compareAtPrice')::numeric,'currency','BDT') end,'availabilityLabel',case when p.stock<=0 then 'Out of stock' when p.stock<=5 then 'Low stock' else 'In stock' end),
 'merchandising',jsonb_build_object('isFeatured',false,'isNewArrival',p.created_at>statement_timestamp()-interval '30 days'),
 'content',jsonb_build_object('summary',p.description),'media',coalesce(media.images->0,jsonb_build_object('src','/images/watch-hero.webp','alt',p.name)),
 'gallery',coalesce(media.images,'[]'),'publishedAt',greatest(p.updated_at,p.watch_updated)
 )),'[]') from paged p
 left join lateral (select jsonb_agg(jsonb_build_object('src',storage_path,'alt',coalesce(alt_text,p.name)) order by display_order,created_at,id) images from catalog.product_media where product_id=p.id) media on true;
$$;
revoke all on function public.watch_catalog(jsonb),public.watch_categories(),public.watch_brands() from public;
grant execute on function public.watch_catalog(jsonb),public.watch_categories(),public.watch_brands() to anon,authenticated;
notify pgrst,'reload schema';

create function public.watch_sitemap() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('slug',p.slug,'updatedAt',greatest(p.updated_at,w.updated_at))),'[]') from catalog.products p join catalog.watch_details w on w.product_id=p.id join catalog.brands b on b.id=p.brand_id and b.is_visible and b.archived_at is null join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary join catalog.categories c on c.id=pc.category_id and c.is_visible and c.archived_at is null where p.status='published';
$$;
revoke all on function public.watch_sitemap() from public;grant execute on function public.watch_sitemap() to anon,authenticated;
