-- REYON Business OS: Sprint 15 structured private checkout address.

create table commerce.checkout_addresses (
  cart_id uuid primary key references commerce.carts(id) on delete cascade,
  full_name text not null,
  phone text not null,
  flat_no text,
  house_no text not null,
  road text not null,
  village_city text not null,
  thana_upazila text not null,
  district text not null,
  division text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint checkout_address_required check (
    btrim(full_name)<>'' and btrim(phone)<>'' and btrim(house_no)<>'' and btrim(road)<>'' and
    btrim(village_city)<>'' and btrim(thana_upazila)<>'' and btrim(district)<>'' and btrim(division)<>''
  ),
  constraint checkout_address_flat_present check(flat_no is null or btrim(flat_no)<>'')
);
alter table commerce.checkout_addresses enable row level security;
revoke all on commerce.checkout_addresses from public,anon,authenticated;
grant all on commerce.checkout_addresses to service_role;

create or replace function public.checkout_save_address(
  p_access_token uuid,p_full_name text,p_phone text,p_flat_no text,p_house_no text,p_road text,
  p_village_city text,p_thana_upazila text,p_district text,p_division text
) returns void language plpgsql security definer set search_path='' as $$
declare owned_cart uuid;
begin
  select id into owned_cart from commerce.carts where access_token=p_access_token and expires_at>statement_timestamp();
  if owned_cart is null then raise exception 'Active cart not found.'; end if;
  insert into commerce.checkout_addresses(cart_id,full_name,phone,flat_no,house_no,road,village_city,thana_upazila,district,division)
  values(owned_cart,btrim(p_full_name),btrim(p_phone),nullif(btrim(p_flat_no),''),btrim(p_house_no),btrim(p_road),btrim(p_village_city),btrim(p_thana_upazila),btrim(p_district),btrim(p_division))
  on conflict(cart_id) do update set full_name=excluded.full_name,phone=excluded.phone,flat_no=excluded.flat_no,
    house_no=excluded.house_no,road=excluded.road,village_city=excluded.village_city,thana_upazila=excluded.thana_upazila,
    district=excluded.district,division=excluded.division,updated_at=statement_timestamp();
  perform commerce.touch_cart(owned_cart);
end; $$;

create or replace function public.checkout_address(p_access_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('fullName',a.full_name,'phone',a.phone,'flatNo',a.flat_no,'houseNo',a.house_no,
    'road',a.road,'villageCity',a.village_city,'thanaUpazila',a.thana_upazila,'district',a.district,'division',a.division)
  from commerce.carts c join commerce.checkout_addresses a on a.cart_id=c.id
  where c.access_token=p_access_token and c.expires_at>statement_timestamp();
$$;
revoke all on function public.checkout_save_address(uuid,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.checkout_address(uuid) from public;
grant execute on function public.checkout_save_address(uuid,text,text,text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.checkout_address(uuid) to anon,authenticated;

comment on table commerce.checkout_addresses is 'Private minimal delivery address attached to an opaque active cart; never publicly readable.';
