-- Sprint 21A: industry-neutral accounting configuration. No financial posting is enabled.

create table accounting.organization_profiles(
 organization_id uuid primary key references organization.organizations(id)on delete restrict,
 legal_entity_name text,legal_entity_type text,fiscal_year_start_month smallint,
 accounting_basis text not null default'accrual',timezone_name text not null default'Asia/Dhaka',
 valuation_method text not null default'weighted-average',currency_code text not null default'BDT',
 configured_at timestamptz,configured_by uuid,
 constraint accounting_basis_approved check(accounting_basis='accrual'),
 constraint accounting_timezone_approved check(timezone_name='Asia/Dhaka'),
 constraint accounting_valuation_approved check(valuation_method='weighted-average'),
 constraint accounting_currency_approved check(currency_code='BDT'),
 constraint fiscal_month_valid check(fiscal_year_start_month is null or fiscal_year_start_month between 1 and 12),
 constraint legal_entity_pair check((legal_entity_name is null)=(legal_entity_type is null))
);
create table accounting.finance_approvers(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organization.organizations(id)on delete restrict,
 user_id uuid not null,authorized_by uuid not null,authorized_at timestamptz not null default statement_timestamp(),revoked_at timestamptz,
 unique(organization_id,user_id)
);
create table accounting.fiscal_periods(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organization.organizations(id)on delete restrict,
 period_key text not null,start_date date not null,end_date date not null,status_key text not null default'open',
 closed_at timestamptz,closed_by uuid,reopened_at timestamptz,reopened_by uuid,control_reason text,
 unique(organization_id,period_key),check(end_date>=start_date),check(status_key in('open','closed')),
 check((status_key='open')or(closed_at is not null and closed_by is not null))
);
alter table accounting.ledger_accounts add column account_class text,add column account_group text,
 add column normal_balance text,add column is_active boolean not null default true,
 add constraint ledger_account_class_approved check(account_class is null or account_class in('asset','liability','equity','revenue','contra-revenue','cogs','expense')),
 add constraint ledger_account_normal_balance check(normal_balance is null or normal_balance in('debit','credit'));
create table accounting.financial_accounts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organization.organizations(id)on delete restrict,
 ledger_account_id uuid not null,account_kind text not null,display_name text not null,provider_name text,masked_reference text,
 is_active boolean not null default true,created_at timestamptz not null default statement_timestamp(),created_by uuid not null,
 unique(organization_id,display_name),foreign key(ledger_account_id,organization_id)references accounting.ledger_accounts(id,organization_id)on delete restrict,
 check(account_kind in('cash','bank','mfs','card-clearing','cod-clearing')),check(btrim(display_name)<>'')
);
create table accounting.opening_balance_evidence(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references organization.organizations(id)on delete restrict,
 financial_account_id uuid not null references accounting.financial_accounts(id)on delete restrict,
 amount numeric(18,2)not null,effective_date date not null,evidence_reference text not null,recorded_by uuid not null,
 recorded_at timestamptz not null default statement_timestamp(),unique(financial_account_id),check(btrim(evidence_reference)<>'')
);
create trigger opening_balance_immutable before update or delete on accounting.opening_balance_evidence for each row execute function accounting.prevent_evidence_mutation();
alter table accounting.organization_profiles enable row level security;alter table accounting.finance_approvers enable row level security;
alter table accounting.fiscal_periods enable row level security;alter table accounting.financial_accounts enable row level security;
alter table accounting.opening_balance_evidence enable row level security;
revoke all on accounting.organization_profiles,accounting.finance_approvers,accounting.fiscal_periods,accounting.financial_accounts,accounting.opening_balance_evidence from public,anon,authenticated;
grant all on accounting.organization_profiles,accounting.finance_approvers,accounting.fiscal_periods,accounting.financial_accounts,accounting.opening_balance_evidence to service_role;
insert into accounting.organization_profiles(organization_id)select id from organization.organizations where code='reyon-online'on conflict do nothing;

create or replace function public.admin_accounting_foundation()returns jsonb language plpgsql stable security definer set search_path=''as $$
declare oid uuid;profile accounting.organization_profiles%rowtype;
begin
 if public.reyon_admin_role()is null then raise exception'Administrator access required.';end if;
 select id into oid from organization.organizations where code='reyon-online';select *into profile from accounting.organization_profiles where organization_id=oid;
 return jsonb_build_object('profile',jsonb_build_object('legalEntityName',profile.legal_entity_name,'legalEntityType',profile.legal_entity_type,
  'fiscalYearStartMonth',profile.fiscal_year_start_month,'basis',profile.accounting_basis,'timezone',profile.timezone_name,
  'valuationMethod',profile.valuation_method,'currency',profile.currency_code,'isConfigured',profile.configured_at is not null),
  'financeApproverCount',(select count(*)from accounting.finance_approvers where organization_id=oid and revoked_at is null),
  'periods',coalesce((select jsonb_agg(jsonb_build_object('key',period_key,'startDate',start_date,'endDate',end_date,'status',status_key)order by start_date desc)from accounting.fiscal_periods where organization_id=oid),'[]'::jsonb),
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('code',code,'name',display_name,'class',account_class,'group',account_group,'active',is_active)order by code)from accounting.ledger_accounts where organization_id=oid),'[]'::jsonb),
  'financialAccounts',coalesce((select jsonb_agg(jsonb_build_object('kind',account_kind,'name',display_name,'provider',provider_name,'maskedReference',masked_reference,'active',is_active)order by display_name)from accounting.financial_accounts where organization_id=oid),'[]'::jsonb));
end$$;
revoke all on function public.admin_accounting_foundation()from public,anon;grant execute on function public.admin_accounting_foundation()to authenticated;
comment on table accounting.organization_profiles is'Configurable accrual accounting profile; incomplete configuration cannot enable posting.';
