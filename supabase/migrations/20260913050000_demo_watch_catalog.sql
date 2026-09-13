-- Demo-only catalog records make the storefront and checkout testable.
-- They are explicitly labeled as demo items and must be replaced before sales.
do $demo$
declare b uuid; c1 uuid; c2 uuid; c3 uuid; a uuid; p uuid; v uuid; loc uuid;
begin
 perform set_config('request.jwt.claim.sub','4d52a5d4-1d52-4701-ae81-cfece39493e1',false);
 perform set_config('request.jwt.claim.role','authenticated',false);
 insert into catalog.brands(slug,name,description,is_visible,is_featured,country_code)
 values('reyon-demo','REYON Demo Collection','Demonstration watches for testing the storefront.',true,false,'BD')
 on conflict(slug) do update set is_visible=true returning id into b;
 select id into c1 from catalog.categories where slug='classic-watches';
 select id into c2 from catalog.categories where slug='casual-watches';
 select id into c3 from catalog.categories where slug='sports-watches';
 select id into loc from organization.locations where code='main-inventory';
 if not exists(select 1 from catalog.products where slug='reyon-heritage-38-demo') then
  a:=public.admin_create_media_asset('reyon-public','/images/classic-watches.webp','https://reyon-online.vercel.app/images/classic-watches.webp','image/webp',800,1000);
  p:=public.admin_create_watch(jsonb_build_object('p_name','REYON Heritage 38 — Demo','p_slug','reyon-heritage-38-demo','p_brand_id',b,'p_category_id',c1,'p_variant_label','Silver / Black leather','p_sku','RYN-HER-38-DEMO','p_purchase_price',3200,'p_selling_price',4990,'p_compare_at_price',5990,'p_asset_id',a,'p_image_alt','REYON Heritage classic watch','p_country_code','BD','p_product_code','DEMO-HER-38','p_publish',true,'specifications',jsonb_build_object('model','Heritage 38','gender','unisex','movement','Quartz','display','Analog','dialColor','Ivory','caseColor','Silver','caseMaterial','Stainless steel','strapMaterial','Leather','strapColor','Black','caseSize','38 mm','waterResistance','5 ATM','warranty','Demo coverage — verify before sale'),'description','Demo catalog item for testing the REYON watch storefront.'));
  select id into v from catalog.variants where product_id=p limit 1; perform public.admin_record_inventory_movement(v,loc,'opening-stock',12,'Demo stock for storefront testing',null);
  a:=public.admin_create_media_asset('reyon-public','/images/casual-watches.webp','https://reyon-online.vercel.app/images/casual-watches.webp','image/webp',800,1000);
  p:=public.admin_create_watch(jsonb_build_object('p_name','REYON Field 40 — Demo','p_slug','reyon-field-40-demo','p_brand_id',b,'p_category_id',c2,'p_variant_label','Steel / Sage nylon','p_sku','RYN-FLD-40-DEMO','p_purchase_price',3900,'p_selling_price',6290,'p_compare_at_price',6990,'p_asset_id',a,'p_image_alt','REYON Field everyday watch','p_country_code','BD','p_product_code','DEMO-FLD-40','p_publish',true,'specifications',jsonb_build_object('model','Field 40','gender','unisex','movement','Automatic','display','Analog','dialColor','Cream','caseColor','Silver','caseMaterial','Stainless steel','strapMaterial','Nylon','strapColor','Sage','caseSize','40 mm','waterResistance','10 ATM','warranty','Demo coverage — verify before sale'),'description','Demo catalog item for testing the REYON watch storefront.'));
  select id into v from catalog.variants where product_id=p limit 1; perform public.admin_record_inventory_movement(v,loc,'opening-stock',9,'Demo stock for storefront testing',null);
  a:=public.admin_create_media_asset('reyon-public','/images/sports-watches.webp','https://reyon-online.vercel.app/images/sports-watches.webp','image/webp',800,1000);
  p:=public.admin_create_watch(jsonb_build_object('p_name','REYON Summit Chrono — Demo','p_slug','reyon-summit-chrono-demo','p_brand_id',b,'p_category_id',c3,'p_variant_label','Graphite / Black rubber','p_sku','RYN-SUM-CHR-DEMO','p_purchase_price',5200,'p_selling_price',8490,'p_compare_at_price',9490,'p_asset_id',a,'p_image_alt','REYON Summit sports chronograph','p_country_code','BD','p_product_code','DEMO-SUM-CHR','p_publish',true,'specifications',jsonb_build_object('model','Summit Chrono','gender','men','movement','Quartz','display','Chronograph','dialColor','Graphite','caseColor','Graphite','caseMaterial','Stainless steel','strapMaterial','Silicone','strapColor','Black','caseSize','42 mm','waterResistance','10 ATM','warranty','Demo coverage — verify before sale'),'description','Demo catalog item for testing the REYON watch storefront.'));
  select id into v from catalog.variants where product_id=p limit 1; perform public.admin_record_inventory_movement(v,loc,'opening-stock',7,'Demo stock for storefront testing',null);
 end if;
end $demo$;
