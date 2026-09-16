-- Harden POS workforce administration after the initial operating release.
-- Additive migration: no existing business or authentication data is removed.

create table if not exists access.employee_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  updated_at timestamptz not null default statement_timestamp(),
  updated_by uuid references auth.users(id) on delete restrict,
  constraint employee_profile_name_present check(btrim(full_name)<>''),
  constraint employee_profile_phone_present check(phone is null or btrim(phone)<>'')
);

alter table access.employee_profiles enable row level security;
revoke all on access.employee_profiles from public, anon, authenticated;
grant all on access.employee_profiles to service_role;

create or replace function public.pos_staff(p_location_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select case when access.has_capability('staff.manage',p_location_id) then coalesce(jsonb_agg(jsonb_build_object(
  'userId',m.user_id,'name',coalesce(p.full_name,u.email),'email',u.email,'phone',p.phone,
  'role',m.role_key,'active',m.revoked_at is null,
  'assigned',exists(select 1 from access.member_location_assignments a where a.user_id=m.user_id and a.location_id=p_location_id and a.revoked_at is null),
  'capabilities',coalesce((select jsonb_agg(c.capability_key order by c.capability_key)from access.capability_definitions c
    where coalesce((select o.is_granted from access.member_capability_overrides o where o.user_id=m.user_id and o.capability_key=c.capability_key),
      exists(select 1 from access.role_capabilities rc where rc.role_key=m.role_key and rc.capability_key=c.capability_key),false)),'[]'::jsonb)
)order by u.email),'[]'::jsonb) end
from access.admin_memberships m
join auth.users u on u.id=m.user_id
left join access.employee_profiles p on p.user_id=m.user_id
where exists(
  select 1 from access.member_location_assignments assigned
  where assigned.user_id=m.user_id and assigned.location_id=p_location_id
) and (public.reyon_admin_role()='super-admin' or m.role_key='staff');
$$;

create or replace function public.pos_set_staff_access(p_user_id uuid,p_location_id uuid,p_role text,p_active boolean,p_capabilities jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare cap text; caller_role text:=public.reyon_admin_role();
begin
  if not access.has_capability('staff.manage',p_location_id) then raise exception 'Staff management permission required.'; end if;
  if p_role not in('super-admin','admin','staff') then raise exception 'Unsupported staff role.'; end if;
  if caller_role<>'super-admin' and p_role<>'staff' then raise exception 'Only a Super Admin can assign administrator roles.'; end if;
  if caller_role<>'super-admin' and exists(
    select 1 from access.admin_memberships target
    where target.user_id=p_user_id and target.role_key in('super-admin','admin')
  ) then raise exception 'Only a Super Admin can manage administrator accounts.'; end if;
  if p_user_id=auth.uid() and not p_active then raise exception 'You cannot deactivate your own account.'; end if;
  if jsonb_typeof(p_capabilities) is distinct from 'array' then raise exception 'Capabilities must be an array.'; end if;
  if exists(
    select 1 from access.member_location_assignments assigned
    where assigned.user_id=p_user_id and assigned.location_id<>p_location_id
      and assigned.revoked_at is null
      and not access.has_capability('staff.manage',assigned.location_id)
  ) then raise exception 'You cannot manage an employee assigned to another location.'; end if;
  for cap in select jsonb_array_elements_text(p_capabilities) loop
    if not exists(select 1 from access.capability_definitions where capability_key=cap) then
      raise exception 'Unsupported capability: %.',cap;
    end if;
    if not access.has_capability(cap,p_location_id) then
      raise exception 'You cannot grant a capability you do not hold: %.',cap;
    end if;
  end loop;
  insert into access.admin_memberships(user_id,role_key,granted_by,revoked_at,revocation_reason)
  values(p_user_id,p_role,auth.uid(),case when p_active then null else statement_timestamp() end,case when p_active then null else 'Deactivated by staff manager' end)
  on conflict(user_id)do update set role_key=excluded.role_key,revoked_at=excluded.revoked_at,revocation_reason=excluded.revocation_reason;
  insert into access.member_location_assignments(user_id,location_id,assigned_by,revoked_at)
  values(p_user_id,p_location_id,auth.uid(),case when p_active then null else statement_timestamp() end)
  on conflict(user_id,location_id)do update set revoked_at=excluded.revoked_at,assigned_by=auth.uid(),assigned_at=statement_timestamp();
  delete from access.member_capability_overrides where user_id=p_user_id;
  for cap in select jsonb_array_elements_text(p_capabilities) loop
    insert into access.member_capability_overrides(user_id,capability_key,is_granted,changed_by)
    values(p_user_id,cap,true,auth.uid());
  end loop;
  insert into access.member_capability_overrides(user_id,capability_key,is_granted,changed_by)
  select p_user_id,c.capability_key,false,auth.uid() from access.capability_definitions c
  where not(p_capabilities ? c.capability_key) on conflict(user_id,capability_key)do nothing;
end;
$$;

create or replace function public.pos_set_staff_profile(p_user_id uuid,p_location_id uuid,p_full_name text,p_phone text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not access.has_capability('staff.manage',p_location_id) then raise exception 'Staff management permission required.'; end if;
  if nullif(btrim(p_full_name),'') is null then raise exception 'Employee name is required.'; end if;
  if not exists(
    select 1 from access.member_location_assignments assigned
    where assigned.user_id=p_user_id and assigned.location_id=p_location_id
  ) then raise exception 'Employee is not assigned to this location.'; end if;
  if public.reyon_admin_role()<>'super-admin' and exists(
    select 1 from access.admin_memberships target
    where target.user_id=p_user_id and target.role_key in('super-admin','admin')
  ) then raise exception 'Only a Super Admin can manage administrator accounts.'; end if;
  insert into access.employee_profiles(user_id,full_name,phone,updated_by)
  values(p_user_id,btrim(p_full_name),nullif(btrim(p_phone),''),auth.uid())
  on conflict(user_id)do update set full_name=excluded.full_name,phone=excluded.phone,
    updated_at=statement_timestamp(),updated_by=auth.uid();
end;
$$;

revoke all on function public.pos_staff(uuid) from public, anon;
revoke all on function public.pos_set_staff_access(uuid,uuid,text,boolean,jsonb) from public, anon;
revoke all on function public.pos_set_staff_profile(uuid,uuid,text,text) from public, anon;
grant execute on function public.pos_staff(uuid),public.pos_set_staff_access(uuid,uuid,text,boolean,jsonb),
  public.pos_set_staff_profile(uuid,uuid,text,text) to authenticated;

notify pgrst, 'reload schema';
