-- REYON Business OS: deny-by-default admin authentication foundation.
-- Supabase Auth owns credentials and sessions. This schema stores only the
-- explicit authorization relationship. No user or membership is created.

create schema if not exists access;

revoke all on schema access from public, anon, authenticated;
grant usage on schema access to service_role;

create table access.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default statement_timestamp(),
  granted_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revocation_reason text,
  constraint admin_memberships_revocation_reason_present
    check (revocation_reason is null or btrim(revocation_reason) <> ''),
  constraint admin_memberships_revocation_consistent
    check (revoked_at is not null or revocation_reason is null)
);

alter table access.admin_memberships enable row level security;

revoke all on access.admin_memberships from public, anon, authenticated;
grant all on access.admin_memberships to service_role;

create or replace function public.is_reyon_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from access.admin_memberships
    where user_id = auth.uid()
      and revoked_at is null
  );
$$;

revoke all on function public.is_reyon_admin() from public, anon;
grant execute on function public.is_reyon_admin() to authenticated;

comment on schema access is
  'Private workforce authorization boundary. Supabase Auth remains credential and session authority.';
comment on table access.admin_memberships is
  'Explicit deny-by-default authorization for the REYON administration surface. No business capability roles are implied.';
comment on function public.is_reyon_admin() is
  'Returns whether the authenticated caller has an active REYON admin membership; it grants no domain capability by itself.';
