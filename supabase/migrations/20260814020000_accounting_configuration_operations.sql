-- Sprint 21B: controlled, audited accounting configuration. No values are seeded.

alter table accounting.organization_profiles
  add column posting_enabled boolean not null default false,
  add column activated_at timestamptz,
  add column activated_by uuid;

alter table accounting.ledger_accounts
  add column approved_at timestamptz,
  add column approved_by uuid;

create table accounting.opening_balance_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  effective_date date not null,
  evidence_reference text not null,
  status_key text not null default 'draft' check (status_key in ('draft', 'activated', 'superseded')),
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null,
  activated_at timestamptz,
  activated_by uuid,
  check (btrim(evidence_reference) <> ''),
  check (status_key <> 'activated' or (activated_at is not null and activated_by is not null))
);

create unique index one_draft_opening_balance_batch
  on accounting.opening_balance_batches(organization_id) where status_key = 'draft';
create unique index one_active_opening_balance_batch
  on accounting.opening_balance_batches(organization_id) where status_key = 'activated';

create table accounting.opening_balance_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  batch_id uuid not null references accounting.opening_balance_batches(id) on delete restrict,
  ledger_account_id uuid not null,
  line_number integer not null check (line_number > 0),
  signed_amount numeric(18,2) not null check (signed_amount <> 0),
  foreign key (ledger_account_id, organization_id)
    references accounting.ledger_accounts(id, organization_id) on delete restrict,
  unique(batch_id, line_number),
  unique(batch_id, ledger_account_id)
);

create table accounting.configuration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  event_key text not null check (event_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  subject_reference text not null check (btrim(subject_reference) <> ''),
  previous_value jsonb,
  new_value jsonb not null,
  reason text not null check (btrim(reason) <> ''),
  actor_id uuid not null,
  actor_role text not null,
  occurred_at timestamptz not null default statement_timestamp()
);

create trigger opening_balance_lines_immutable before update or delete on accounting.opening_balance_lines
for each row execute function accounting.prevent_evidence_mutation();
create trigger accounting_configuration_events_immutable before update or delete on accounting.configuration_events
for each row execute function accounting.prevent_evidence_mutation();

alter table accounting.opening_balance_batches enable row level security;
alter table accounting.opening_balance_lines enable row level security;
alter table accounting.configuration_events enable row level security;
revoke all on accounting.opening_balance_batches, accounting.opening_balance_lines, accounting.configuration_events from public, anon, authenticated;
grant all on accounting.opening_balance_batches, accounting.opening_balance_lines, accounting.configuration_events to service_role;

create or replace function accounting.can_configure()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.reyon_admin_role() = 'super-admin' or exists (
    select 1 from accounting.finance_approvers fa
    join organization.organizations o on o.id = fa.organization_id and o.code = 'reyon-online'
    where fa.user_id = auth.uid() and fa.revoked_at is null
  );
$$;
revoke all on function accounting.can_configure() from public, anon, authenticated;

create or replace function accounting.record_configuration_event(
  p_event text, p_subject text, p_previous jsonb, p_new jsonb, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare oid uuid;
begin
  select id into oid from organization.organizations where code = 'reyon-online';
  insert into accounting.configuration_events(
    organization_id,event_key,subject_reference,previous_value,new_value,reason,actor_id,actor_role
  ) values (oid,p_event,p_subject,p_previous,p_new,btrim(p_reason),auth.uid(),public.reyon_admin_role());
end$$;
revoke all on function accounting.record_configuration_event(text,text,jsonb,jsonb,text) from public, anon, authenticated;

create or replace function public.admin_save_accounting_profile(
  p_legal_name text, p_legal_type text, p_fiscal_month integer, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare oid uuid; old_value jsonb; new_value jsonb;
begin
  if not accounting.can_configure() then raise exception 'Finance configuration authority required.'; end if;
  if nullif(btrim(p_legal_name),'') is null or nullif(btrim(p_legal_type),'') is null then raise exception 'Legal entity name and type are required.'; end if;
  if p_fiscal_month not between 1 and 12 then raise exception 'Select a valid fiscal-year starting month.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Change reason is required.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  select to_jsonb(p) into old_value from accounting.organization_profiles p where organization_id=oid;
  update accounting.organization_profiles set legal_entity_name=btrim(p_legal_name),legal_entity_type=btrim(p_legal_type),
    fiscal_year_start_month=p_fiscal_month,configured_at=statement_timestamp(),configured_by=auth.uid(),
    posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  select to_jsonb(p) into new_value from accounting.organization_profiles p where organization_id=oid;
  perform accounting.record_configuration_event('profile-saved','organization-profile',old_value,new_value,p_reason);
end$$;

create or replace function public.admin_assign_finance_approver(p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare oid uuid; member_role text;
begin
  if public.reyon_admin_role() <> 'super-admin' then raise exception 'Super Admin authority is required to assign a Finance approver.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Assignment reason is required.'; end if;
  select role_key into member_role from access.admin_memberships where user_id=p_user_id and revoked_at is null;
  if member_role not in ('super-admin','admin') then raise exception 'Finance approver must be an active Admin or Super Admin.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  insert into accounting.finance_approvers(organization_id,user_id,authorized_by)
    values(oid,p_user_id,auth.uid())
  on conflict(organization_id,user_id) do update set revoked_at=null,authorized_by=auth.uid(),authorized_at=statement_timestamp();
  update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  perform accounting.record_configuration_event('finance-approver-assigned',p_user_id::text,null,jsonb_build_object('role',member_role),p_reason);
end$$;

create or replace function public.admin_save_ledger_account(
  p_code text,p_name text,p_class text,p_group text,p_normal_balance text,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare oid uuid; account_id uuid; old_value jsonb; new_value jsonb;
begin
  if not accounting.can_configure() then raise exception 'Finance configuration authority required.'; end if;
  if nullif(btrim(p_code),'') is null or nullif(btrim(p_name),'') is null or nullif(btrim(p_group),'') is null then raise exception 'Code, name, and group are required.'; end if;
  if p_class not in ('asset','liability','equity','revenue','contra-revenue','cogs','expense') then raise exception 'Select an approved account class.'; end if;
  if p_normal_balance not in ('debit','credit') then raise exception 'Select debit or credit normal balance.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Approval reason is required.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  select id,to_jsonb(a) into account_id,old_value from accounting.ledger_accounts a where organization_id=oid and lower(code)=lower(btrim(p_code));
  if account_id is null then
    insert into accounting.ledger_accounts(organization_id,code,display_name,account_class,account_group,normal_balance,is_active,approved_at,approved_by)
    values(oid,btrim(p_code),btrim(p_name),p_class,btrim(p_group),p_normal_balance,true,statement_timestamp(),auth.uid()) returning id into account_id;
  else
    update accounting.ledger_accounts set display_name=btrim(p_name),account_class=p_class,account_group=btrim(p_group),normal_balance=p_normal_balance,
      is_active=true,approved_at=statement_timestamp(),approved_by=auth.uid() where id=account_id;
  end if;
  update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  select to_jsonb(a) into new_value from accounting.ledger_accounts a where id=account_id;
  perform accounting.record_configuration_event('ledger-account-approved',account_id::text,old_value,new_value,p_reason);
  return account_id;
end$$;

create or replace function public.admin_save_financial_account(
  p_kind text,p_name text,p_ledger_account_id uuid,p_provider text,p_masked_reference text,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare oid uuid; financial_id uuid; old_value jsonb; new_value jsonb;
begin
  if not accounting.can_configure() then raise exception 'Finance configuration authority required.'; end if;
  if p_kind not in ('cash','bank','mfs','card-clearing','cod-clearing') then raise exception 'Select a supported financial account type.'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Account display name is required.'; end if;
  if p_kind <> 'cash' and (nullif(btrim(p_provider),'') is null or nullif(btrim(p_masked_reference),'') is null) then raise exception 'Provider and masked reference are required.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Approval reason is required.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  if not exists(select 1 from accounting.ledger_accounts where id=p_ledger_account_id and organization_id=oid and is_active and approved_at is not null) then raise exception 'Select an approved active ledger account.'; end if;
  select id,to_jsonb(f) into financial_id,old_value from accounting.financial_accounts f where organization_id=oid and lower(display_name)=lower(btrim(p_name));
  if financial_id is null then
    insert into accounting.financial_accounts(organization_id,ledger_account_id,account_kind,display_name,provider_name,masked_reference,created_by)
    values(oid,p_ledger_account_id,p_kind,btrim(p_name),nullif(btrim(p_provider),''),nullif(btrim(p_masked_reference),''),auth.uid()) returning id into financial_id;
  else
    update accounting.financial_accounts set ledger_account_id=p_ledger_account_id,account_kind=p_kind,provider_name=nullif(btrim(p_provider),''),
      masked_reference=nullif(btrim(p_masked_reference),''),is_active=true where id=financial_id;
  end if;
  update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  select to_jsonb(f) into new_value from accounting.financial_accounts f where id=financial_id;
  perform accounting.record_configuration_event('financial-account-approved',financial_id::text,old_value,new_value,p_reason);
  return financial_id;
end$$;

create or replace function public.admin_save_opening_balances(
  p_effective_date date,p_evidence_reference text,p_lines jsonb,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare oid uuid; batch_id uuid; item jsonb; account_id uuid; debit numeric; credit numeric; signed numeric; line_no integer:=0; total numeric:=0;
begin
  if not accounting.can_configure() then raise exception 'Finance configuration authority required.'; end if;
  if p_effective_date is null or nullif(btrim(p_evidence_reference),'') is null then raise exception 'Effective date and evidence reference are required.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Approval reason is required.'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then raise exception 'At least two non-zero opening-balance lines are required.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  update accounting.opening_balance_batches set status_key='superseded' where organization_id=oid and status_key in ('draft','activated');
  insert into accounting.opening_balance_batches(organization_id,effective_date,evidence_reference,created_by)
    values(oid,p_effective_date,btrim(p_evidence_reference),auth.uid()) returning id into batch_id;
  for item in select value from jsonb_array_elements(p_lines) loop
    account_id:=(item->>'accountId')::uuid; debit:=coalesce((item->>'debit')::numeric,0); credit:=coalesce((item->>'credit')::numeric,0);
    if debit<0 or credit<0 or (debit>0 and credit>0) or (debit=0 and credit=0) then raise exception 'Each line requires one positive debit or credit amount.'; end if;
    if not exists(select 1 from accounting.ledger_accounts where id=account_id and organization_id=oid and is_active and approved_at is not null) then raise exception 'Opening balance contains an unapproved account.'; end if;
    signed:=debit-credit; total:=total+signed; line_no:=line_no+1;
    insert into accounting.opening_balance_lines(organization_id,batch_id,ledger_account_id,line_number,signed_amount)
      values(oid,batch_id,account_id,line_no,signed);
  end loop;
  if round(total,2)<>0 then raise exception 'Opening balances must balance: total debits must equal total credits.'; end if;
  update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  perform accounting.record_configuration_event('opening-balances-saved',batch_id::text,null,
    jsonb_build_object('effectiveDate',p_effective_date,'evidenceReference',p_evidence_reference,'lineCount',line_no),p_reason);
  return batch_id;
end$$;

create or replace function public.admin_activate_accounting_configuration(p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare oid uuid; batch_id uuid; missing text[]:=array[]::text[]; cls text; kind text;
begin
  if not accounting.can_configure() then raise exception 'Finance activation authority required.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Activation reason is required.'; end if;
  select id into oid from organization.organizations where code='reyon-online';
  if not exists(select 1 from accounting.organization_profiles where organization_id=oid and legal_entity_name is not null and legal_entity_type is not null and fiscal_year_start_month is not null) then missing:=array_append(missing,'legal/fiscal profile'); end if;
  if not exists(select 1 from accounting.finance_approvers where organization_id=oid and revoked_at is null) then missing:=array_append(missing,'Finance approver'); end if;
  foreach cls in array array['asset','liability','equity','revenue','contra-revenue','cogs','expense'] loop
    if not exists(select 1 from accounting.ledger_accounts where organization_id=oid and account_class=cls and is_active and approved_at is not null) then missing:=array_append(missing,cls||' account'); end if;
  end loop;
  foreach kind in array array['cash','bank','mfs','card-clearing','cod-clearing'] loop
    if not exists(select 1 from accounting.financial_accounts where organization_id=oid and account_kind=kind and is_active) then missing:=array_append(missing,kind||' financial account'); end if;
  end loop;
  select id into batch_id from accounting.opening_balance_batches where organization_id=oid and status_key='draft';
  if batch_id is null then missing:=array_append(missing,'balanced opening balances with evidence'); end if;
  if cardinality(missing)>0 then raise exception 'Configuration incomplete: %',array_to_string(missing,', '); end if;
  update accounting.opening_balance_batches set status_key='activated',activated_at=statement_timestamp(),activated_by=auth.uid() where id=batch_id;
  update accounting.organization_profiles set posting_enabled=true,activated_at=statement_timestamp(),activated_by=auth.uid() where organization_id=oid;
  perform accounting.record_configuration_event('configuration-activated','organization-profile',null,jsonb_build_object('openingBalanceBatchId',batch_id),p_reason);
end$$;

create or replace function public.admin_accounting_foundation() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare oid uuid; profile accounting.organization_profiles%rowtype;
begin
 if public.reyon_admin_role() is null then raise exception 'Administrator access required.'; end if;
 select id into oid from organization.organizations where code='reyon-online'; select * into profile from accounting.organization_profiles where organization_id=oid;
 return jsonb_build_object(
  'profile',jsonb_build_object('legalEntityName',profile.legal_entity_name,'legalEntityType',profile.legal_entity_type,'fiscalYearStartMonth',profile.fiscal_year_start_month,
    'basis',profile.accounting_basis,'timezone',profile.timezone_name,'valuationMethod',profile.valuation_method,'currency',profile.currency_code,
    'isConfigured',profile.configured_at is not null,'postingEnabled',profile.posting_enabled,'activatedAt',profile.activated_at),
  'canConfigure',accounting.can_configure(),'isSuperAdmin',public.reyon_admin_role()='super-admin',
  'financeApprovers',coalesce((select jsonb_agg(jsonb_build_object('userId',fa.user_id,'email',u.email,'authorizedAt',fa.authorized_at) order by fa.authorized_at) from accounting.finance_approvers fa join auth.users u on u.id=fa.user_id where fa.organization_id=oid and fa.revoked_at is null),'[]'::jsonb),
  'adminCandidates',coalesce((select jsonb_agg(jsonb_build_object('userId',m.user_id,'email',u.email,'role',m.role_key) order by u.email) from access.admin_memberships m join auth.users u on u.id=m.user_id where m.revoked_at is null and m.role_key in('super-admin','admin')),'[]'::jsonb),
  'periods',coalesce((select jsonb_agg(jsonb_build_object('key',period_key,'startDate',start_date,'endDate',end_date,'status',status_key) order by start_date desc) from accounting.fiscal_periods where organization_id=oid),'[]'::jsonb),
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'name',display_name,'class',account_class,'group',account_group,'normalBalance',normal_balance,'active',is_active,'approvedAt',approved_at) order by code) from accounting.ledger_accounts where organization_id=oid),'[]'::jsonb),
  'financialAccounts',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'ledgerAccountId',f.ledger_account_id,'kind',f.account_kind,'name',f.display_name,'provider',f.provider_name,'maskedReference',f.masked_reference,'active',f.is_active) order by f.display_name) from accounting.financial_accounts f where organization_id=oid),'[]'::jsonb),
  'openingBalance',(select jsonb_build_object('id',b.id,'effectiveDate',b.effective_date,'evidenceReference',b.evidence_reference,'status',b.status_key,
    'debits',coalesce(sum(case when l.signed_amount>0 then l.signed_amount else 0 end),0),'credits',coalesce(sum(case when l.signed_amount<0 then -l.signed_amount else 0 end),0),'lineCount',count(l.id))
    from accounting.opening_balance_batches b left join accounting.opening_balance_lines l on l.batch_id=b.id where b.organization_id=oid and b.status_key in('draft','activated') group by b.id order by (b.status_key='activated') desc,b.created_at desc limit 1),
  'auditEvents',coalesce((select jsonb_agg(jsonb_build_object('event',event_key,'subject',subject_reference,'reason',reason,'actorRole',actor_role,'occurredAt',occurred_at) order by occurred_at desc) from (select * from accounting.configuration_events where organization_id=oid order by occurred_at desc limit 30)e),'[]'::jsonb));
end$$;

revoke all on function public.admin_save_accounting_profile(text,text,integer,text) from public,anon;
revoke all on function public.admin_assign_finance_approver(uuid,text) from public,anon;
revoke all on function public.admin_save_ledger_account(text,text,text,text,text,text) from public,anon;
revoke all on function public.admin_save_financial_account(text,text,uuid,text,text,text) from public,anon;
revoke all on function public.admin_save_opening_balances(date,text,jsonb,text) from public,anon;
revoke all on function public.admin_activate_accounting_configuration(text) from public,anon;
grant execute on function public.admin_save_accounting_profile(text,text,integer,text) to authenticated;
grant execute on function public.admin_assign_finance_approver(uuid,text) to authenticated;
grant execute on function public.admin_save_ledger_account(text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_save_financial_account(text,text,uuid,text,text,text) to authenticated;
grant execute on function public.admin_save_opening_balances(date,text,jsonb,text) to authenticated;
grant execute on function public.admin_activate_accounting_configuration(text) to authenticated;

comment on table accounting.configuration_events is 'Append-only audit evidence for every sensitive accounting configuration change.';
comment on table accounting.opening_balance_batches is 'Evidence-backed balanced opening configuration; it is not a fabricated default or operational journal.';
