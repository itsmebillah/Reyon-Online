-- REYON Business OS: configurable Sprint 15 delivery zones and charges.
create table fulfillment.delivery_zones(
  id uuid primary key default gen_random_uuid(), zone_key text not null unique, name text not null,
  charge_amount numeric(18,2), currency_code text not null default 'BDT', is_enabled boolean not null default false,
  display_order integer not null default 0, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(),
  constraint delivery_zone_key_format check(zone_key~'^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_zone_name_present check(btrim(name)<>''),
  constraint delivery_zone_charge_valid check(charge_amount is null or charge_amount>=0),
  constraint delivery_zone_enabled_charge check(not is_enabled or charge_amount is not null)
);
insert into fulfillment.delivery_zones(zone_key,name,display_order) values('inside-dhaka','Inside Dhaka',10),('outside-dhaka','Outside Dhaka',20);
alter table fulfillment.delivery_zones enable row level security;
revoke all on fulfillment.delivery_zones from public,anon,authenticated;
grant all on fulfillment.delivery_zones to service_role;

create or replace function public.admin_delivery_zones() returns jsonb language sql stable security definer set search_path='' as $$
 select case when public.is_reyon_admin() then coalesce(jsonb_agg(jsonb_build_object('id',id,'key',zone_key,'name',name,'charge',charge_amount,'currency',currency_code,'isEnabled',is_enabled,'displayOrder',display_order) order by display_order,name),'[]'::jsonb) else null end from fulfillment.delivery_zones;
$$;
create or replace function public.admin_update_delivery_zone(p_zone_id uuid,p_name text,p_charge numeric,p_is_enabled boolean,p_display_order integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
 if p_is_enabled and p_charge is null then raise exception 'Set a charge before enabling this zone.'; end if;
 update fulfillment.delivery_zones set name=btrim(p_name),charge_amount=p_charge,is_enabled=p_is_enabled,display_order=greatest(p_display_order,0),updated_at=statement_timestamp() where id=p_zone_id;
 if not found then raise exception 'Delivery zone not found.'; end if;
end; $$;
create or replace function public.delivery_zones() returns table(id uuid,zone_key text,name text,charge_amount numeric,currency_code text) language sql stable security definer set search_path='' as $$
 select id,zone_key,name,charge_amount,currency_code from fulfillment.delivery_zones where is_enabled and charge_amount is not null order by display_order,name;
$$;
revoke all on function public.admin_delivery_zones() from public,anon;
revoke all on function public.admin_update_delivery_zone(uuid,text,numeric,boolean,integer) from public,anon;
grant execute on function public.admin_delivery_zones() to authenticated;
grant execute on function public.admin_update_delivery_zone(uuid,text,numeric,boolean,integer) to authenticated;
grant execute on function public.delivery_zones() to anon,authenticated;
