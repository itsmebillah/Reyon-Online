create table commerce.watch_checkout_notes(cart_id uuid primary key references commerce.carts(id) on delete cascade,note text not null check(length(note)<=1000));
alter table commerce.watch_checkout_notes enable row level security;
revoke all on commerce.watch_checkout_notes from public,anon,authenticated;
grant all on commerce.watch_checkout_notes to service_role;
create table sales.watch_order_evidence(order_id uuid primary key references sales.orders(id) on delete restrict,delivery_note text,watch_snapshots jsonb not null,created_at timestamptz not null default statement_timestamp());
alter table sales.watch_order_evidence enable row level security;
revoke all on sales.watch_order_evidence from public,anon,authenticated;
grant all on sales.watch_order_evidence to service_role;
create trigger watch_order_evidence_immutable before update or delete on sales.watch_order_evidence for each row execute function sales.prevent_transition_mutation();
create function sales.snapshot_watch_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into sales.watch_order_evidence(order_id,delivery_note,watch_snapshots)
 select new.order_id,(select note from commerce.watch_checkout_notes where cart_id=new.cart_id),coalesce(jsonb_agg(jsonb_build_object('lineId',ol.id,'specifications',w.specifications)),'[]')
 from sales.order_lines ol join catalog.variants v on v.id=ol.catalog_variant_id join catalog.watch_details w on w.product_id=v.product_id where ol.order_id=new.order_id;
 return new;
end $$;
revoke all on function sales.snapshot_watch_order() from public,anon,authenticated;
create trigger cart_order_watch_snapshot after insert on commerce.cart_orders for each row execute function sales.snapshot_watch_order();
create function public.admin_watch_order_evidence(p_order_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if public.is_reyon_admin() is distinct from true then raise exception 'Admin access required.'; end if;
 return (select jsonb_build_object('deliveryNote',delivery_note,'watches',watch_snapshots) from sales.watch_order_evidence where order_id=p_order_id);
end $$;
revoke all on function public.admin_watch_order_evidence(uuid) from public,anon;
grant execute on function public.admin_watch_order_evidence(uuid) to authenticated;
create function public.watch_cart_add_item(p_access_token uuid,p_product_id uuid,p_variant_id uuid,p_quantity integer default 1)
returns integer language plpgsql security definer set search_path='' as $$
declare cid uuid; available numeric; qty integer;
begin
 if p_quantity is null or p_quantity not between 1 and 10 then raise exception 'Choose a quantity between 1 and 10.';end if;
 if not exists(select 1 from catalog.products p join catalog.watch_details w on w.product_id=p.id
 join catalog.variants v on v.product_id=p.id and v.id=p_variant_id
 join catalog.brands b on b.id=p.brand_id and b.is_visible and b.archived_at is null
 join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary
 join catalog.categories c on c.id=pc.category_id and c.is_visible and c.archived_at is null
 join catalog.offers o on o.variant_id=v.id and o.channel_key='website' and o.currency_code='BDT'
 where p.id=p_product_id and p.status='published') then raise exception 'Watch variant is not available.';end if;
 insert into commerce.carts(access_token) values(p_access_token) on conflict(access_token) do nothing;
 select id into cid from commerce.carts where access_token=p_access_token and consumed_at is null for update;
 if cid is null then raise exception 'Active cart not found.';end if;
 select coalesce(sp.available,0) into available from inventory.stock_items si join inventory.stock_position sp on sp.stock_item_id=si.id
 join organization.locations l on l.id=sp.location_id and l.code='main-inventory' where si.catalog_variant_id=p_variant_id;
 select coalesce((select quantity from commerce.cart_items where cart_id=cid and variant_id=p_variant_id),0)+p_quantity into qty;
 if qty>10 then raise exception 'Maximum quantity is 10.';end if;
 if coalesce(available,0)<qty then raise exception 'Requested quantity exceeds available stock.';end if;
 insert into commerce.cart_items(cart_id,variant_id,quantity) values(cid,p_variant_id,qty)
 on conflict(cart_id,variant_id) do update set quantity=excluded.quantity,updated_at=statement_timestamp();
 perform commerce.touch_cart(cid);return qty;
end $$;
revoke all on function public.watch_cart_add_item(uuid,uuid,uuid,integer) from public;
grant execute on function public.watch_cart_add_item(uuid,uuid,uuid,integer) to anon,authenticated;
revoke all on function public.cart_add_item(uuid,uuid,integer) from public,anon,authenticated;

create or replace function public.cart_set_quantity(p_access_token uuid,p_variant_id uuid,p_quantity integer)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select id into cid from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp() and consumed_at is null for update;
 if cid is null then raise exception 'Active cart not found.';end if;
 if p_quantity=0 then delete from commerce.cart_items where cart_id=cid and variant_id=p_variant_id;
 elsif p_quantity between 1 and 10 then update commerce.cart_items set quantity=p_quantity,updated_at=statement_timestamp() where cart_id=cid and variant_id=p_variant_id;
 else raise exception 'Choose a quantity between 0 and 10.';end if;
 perform commerce.touch_cart(cid);
end $$;

create function commerce.bd_phone(p_phone text) returns text language sql immutable set search_path='' as $$
 select case when digits~'^01[3-9][0-9]{8}$' then '+88'||digits when digits~'^8801[3-9][0-9]{8}$' then '+'||digits end
 from (select regexp_replace(translate(p_phone,'০১২৩৪৫৬৭৮৯','0123456789'),'[\s()+-]','','g') digits) n;
$$;
revoke all on function commerce.bd_phone(text) from public,anon,authenticated;

create function public.checkout_save_watch_address(p_access_token uuid,p_name text,p_phone text,p_district text,p_area text,p_address text,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid; phone text; zone_id uuid;
begin
 select id into cid from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp() and consumed_at is null for update;
 if cid is null then raise exception 'Active cart not found.';end if;
 phone:=commerce.bd_phone(p_phone);
 if phone is null then raise exception 'Enter a valid Bangladesh mobile number.';end if;
 if length(btrim(p_name)) not between 2 and 120 or length(btrim(p_area)) not between 2 and 200 or length(btrim(p_address)) not between 5 and 1000 or length(p_notes)>1000 then raise exception 'Review your name and delivery address.';end if;
 if p_district not in ('Bagerhat','Bandarban','Barguna','Barishal','Bhola','Bogura','Brahmanbaria','Chandpur','Chapainawabganj','Chattogram','Chuadanga','Cox''s Bazar','Cumilla','Dhaka','Dinajpur','Faridpur','Feni','Gaibandha','Gazipur','Gopalganj','Habiganj','Jamalpur','Jashore','Jhalokathi','Jhenaidah','Joypurhat','Khagrachhari','Khulna','Kishoreganj','Kurigram','Kushtia','Lakshmipur','Lalmonirhat','Madaripur','Magura','Manikganj','Meherpur','Moulvibazar','Munshiganj','Mymensingh','Naogaon','Narail','Narayanganj','Narsingdi','Natore','Netrokona','Nilphamari','Noakhali','Pabna','Panchagarh','Patuakhali','Pirojpur','Rajbari','Rajshahi','Rangamati','Rangpur','Satkhira','Shariatpur','Sherpur','Sirajganj','Sunamganj','Sylhet','Tangail','Thakurgaon') then raise exception 'Select a Bangladesh district.';end if;
 perform public.checkout_save_address(p_access_token,p_name,phone,null,p_address,p_area,p_district,p_area,p_district,'Bangladesh');
 insert into commerce.watch_checkout_notes(cart_id,note) values(cid,btrim(p_notes)) on conflict(cart_id) do update set note=excluded.note;
 delete from commerce.checkout_delivery_selections where cart_id=cid;
 delete from commerce.checkout_payment_selections where cart_id=cid;
 select id into zone_id from fulfillment.delivery_zones where zone_key=case when p_district='Dhaka' then 'inside-dhaka' else 'outside-dhaka' end and is_enabled and charge_amount is not null;
 if zone_id is not null then insert into commerce.checkout_delivery_selections(cart_id,zone_id) values(cid,zone_id);end if;
end $$;
revoke all on function public.checkout_save_watch_address(uuid,text,text,text,text,text,text) from public;
grant execute on function public.checkout_save_watch_address(uuid,text,text,text,text,text,text) to anon,authenticated;
-- The old address RPC remains internal to the new validating wrapper only.
revoke all on function public.checkout_save_address(uuid,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;

create or replace function public.checkout_select_delivery_zone(p_access_token uuid,p_zone_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select c.id into cid from commerce.carts c join commerce.checkout_addresses a on a.cart_id=c.id
 join fulfillment.delivery_zones z on z.id=p_zone_id and z.is_enabled and z.charge_amount is not null
 and z.zone_key=case when a.district='Dhaka' then 'inside-dhaka' else 'outside-dhaka' end
 where c.access_token=p_access_token and c.expires_at>statement_timestamp() and c.consumed_at is null for update of c;
 if cid is null then raise exception 'Delivery zone does not match this address.';end if;
 insert into commerce.checkout_delivery_selections(cart_id,zone_id) values(cid,p_zone_id) on conflict(cart_id) do update set zone_id=excluded.zone_id;
end $$;

alter function public.checkout_confirm_order(uuid) set schema commerce;
revoke all on function commerce.checkout_confirm_order(uuid) from public,anon,authenticated;
create function public.checkout_confirm_order(p_access_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select id into cid from commerce.carts where access_token=p_access_token and consumed_at is null and expires_at>statement_timestamp() for update;
 if cid is null then raise exception 'Active cart not found.';end if;
 if exists(select 1 from commerce.cart_items where cart_id=cid) then
  if exists(select 1 from commerce.cart_items ci join catalog.variants v on v.id=ci.variant_id left join catalog.watch_details w on w.product_id=v.product_id where ci.cart_id=cid and w.product_id is null) then raise exception 'Remove unavailable items from your bag.';end if;
  if not exists(select 1 from commerce.checkout_addresses a join commerce.checkout_delivery_selections s on s.cart_id=a.cart_id join fulfillment.delivery_zones z on z.id=s.zone_id and z.is_enabled and z.charge_amount is not null where a.cart_id=cid and commerce.bd_phone(a.phone) is not null and z.zone_key=case when a.district='Dhaka' then 'inside-dhaka' else 'outside-dhaka' end) then raise exception 'Save a valid address and delivery option.';end if;
 end if;
 return commerce.checkout_confirm_order(p_access_token);
end $$;
revoke all on function public.checkout_confirm_order(uuid) from public;
grant execute on function public.checkout_confirm_order(uuid) to anon,authenticated;
notify pgrst,'reload schema';
