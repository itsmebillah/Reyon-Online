-- Sprint 21C: immutable double-entry posting and the Completed-sale journal only.

create sequence accounting.journal_reference_sequence;

alter table accounting.journal_entries
  add column journal_reference text,
  add column total_debit numeric(18,2),
  add column total_credit numeric(18,2),
  add column posting_source text,
  add column posted_at timestamptz;

alter table accounting.journal_entries
  add constraint journal_reference_format check (journal_reference is null or journal_reference ~ '^JRN-[0-9]{4}-[0-9]{6}$'),
  add constraint journal_reference_unique unique (journal_reference),
  add constraint journal_totals_valid check (
    (posted_at is null and total_debit is null and total_credit is null and posting_source is null)
    or (posted_at is not null and total_debit > 0 and total_debit = total_credit and nullif(btrim(posting_source),'') is not null)
  );

alter table accounting.journal_lines
  add column debit_amount numeric(18,2),
  add column credit_amount numeric(18,2);

alter table accounting.journal_lines
  add constraint journal_line_debit_credit_valid check (
    (debit_amount > 0 and coalesce(credit_amount,0) = 0 and signed_amount = debit_amount)
    or (credit_amount > 0 and coalesce(debit_amount,0) = 0 and signed_amount = -credit_amount)
  );

create table accounting.posting_account_mappings (
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  purpose_key text not null check (purpose_key in ('product-sales','delivery-revenue','sales-discounts')),
  ledger_account_id uuid not null,
  configured_at timestamptz not null default statement_timestamp(),
  configured_by uuid not null,
  primary key (organization_id,purpose_key),
  foreign key (ledger_account_id,organization_id)
    references accounting.ledger_accounts(id,organization_id) on delete restrict
);

alter table accounting.posting_account_mappings enable row level security;
revoke all on accounting.posting_account_mappings from public,anon,authenticated;
grant all on accounting.posting_account_mappings to service_role;

create or replace function public.admin_save_posting_account_mapping(
  p_purpose text,p_ledger_account_id uuid,p_reason text
) returns void language plpgsql security definer set search_path='' as $$
declare oid uuid; required_class text; old_value jsonb; new_value jsonb;
begin
  if not accounting.can_configure() then raise exception 'Finance configuration authority required.'; end if;
  if p_purpose not in ('product-sales','delivery-revenue','sales-discounts') then raise exception 'Select a supported posting purpose.'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'Mapping reason is required.'; end if;
  required_class:=case when p_purpose='sales-discounts' then 'contra-revenue' else 'revenue' end;
  select id into oid from organization.organizations where code='reyon-online';
  if not exists(select 1 from accounting.ledger_accounts where id=p_ledger_account_id and organization_id=oid and is_active and approved_at is not null and account_class=required_class) then
    raise exception 'Select an approved active % account.',required_class;
  end if;
  select to_jsonb(m) into old_value from accounting.posting_account_mappings m where organization_id=oid and purpose_key=p_purpose;
  insert into accounting.posting_account_mappings(organization_id,purpose_key,ledger_account_id,configured_by)
  values(oid,p_purpose,p_ledger_account_id,auth.uid())
  on conflict(organization_id,purpose_key) do update set ledger_account_id=excluded.ledger_account_id,configured_at=statement_timestamp(),configured_by=auth.uid();
  update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
  select to_jsonb(m) into new_value from accounting.posting_account_mappings m where organization_id=oid and purpose_key=p_purpose;
  perform accounting.record_configuration_event('posting-account-mapped',p_purpose,old_value,new_value,p_reason);
end$$;
revoke all on function public.admin_save_posting_account_mapping(text,uuid,text) from public,anon;
grant execute on function public.admin_save_posting_account_mapping(text,uuid,text) to authenticated;

-- New required semantic mappings cannot be guessed from Finance-entered account names.
update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null;

create or replace function public.admin_activate_accounting_configuration(p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare oid uuid; batch_id uuid; missing text[]:=array[]::text[]; cls text; kind text; purpose text;
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
  foreach purpose in array array['product-sales','delivery-revenue','sales-discounts'] loop
    if not exists(select 1 from accounting.posting_account_mappings where organization_id=oid and purpose_key=purpose) then missing:=array_append(missing,purpose||' mapping'); end if;
  end loop;
  select id into batch_id from accounting.opening_balance_batches where organization_id=oid and status_key in('draft','activated') order by (status_key='activated') desc,created_at desc limit 1;
  if batch_id is null then missing:=array_append(missing,'balanced opening balances with evidence'); end if;
  if cardinality(missing)>0 then raise exception 'Configuration incomplete: %',array_to_string(missing,', '); end if;
  if exists(select 1 from accounting.opening_balance_batches where id=batch_id and status_key='draft') then
    update accounting.opening_balance_batches set status_key='activated',activated_at=statement_timestamp(),activated_by=auth.uid() where id=batch_id;
  end if;
  update accounting.organization_profiles set posting_enabled=true,activated_at=statement_timestamp(),activated_by=auth.uid() where organization_id=oid;
  perform accounting.record_configuration_event('configuration-activated','organization-profile',null,jsonb_build_object('openingBalanceBatchId',batch_id),p_reason);
end$$;

create or replace function accounting.post_completed_sale(p_completed_sale_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare cs sales.completed_sales%rowtype; o sales.orders%rowtype; payment sales.order_payment_details%rowtype;
  oid uuid; debit_account uuid; product_account uuid; delivery_account uuid; discount_account uuid;
  journal_id uuid; ref text; sequence_value bigint; debit_total numeric(18,2); credit_total numeric(18,2); line_no integer:=0;
begin
  select * into cs from sales.completed_sales where id=p_completed_sale_id;
  if cs.id is null then raise exception 'Completed sale not found.'; end if;
  if exists(select 1 from accounting.journal_entries where source_namespace='completed-sale' and source_reference=cs.id::text) then
    return (select id from accounting.journal_entries where source_namespace='completed-sale' and source_reference=cs.id::text);
  end if;
  select * into o from sales.orders where id=cs.order_id;
  select * into payment from sales.order_payment_details where order_id=cs.order_id;
  oid:=o.organization_id;
  if not exists(select 1 from accounting.organization_profiles where organization_id=oid and posting_enabled and activated_at is not null) then raise exception 'Accounting configuration is inactive or incomplete.'; end if;
  if payment.method_kind_snapshot='mobile' then
    select f.ledger_account_id into debit_account from accounting.financial_accounts f
    where f.organization_id=oid and f.is_active and f.account_kind='mfs'
      and lower(regexp_replace(coalesce(f.provider_name,''),'[^a-z0-9]+','','g')) in (
        lower(regexp_replace(payment.method_name_snapshot,'[^a-z0-9]+','','g')),
        lower(regexp_replace(payment.method_key_snapshot,'[^a-z0-9]+','','g'))
      );
  else
    select case when count(*)=1 then min(f.ledger_account_id::text)::uuid end into debit_account
    from accounting.financial_accounts f where f.organization_id=oid and f.is_active
      and f.account_kind=case payment.method_kind_snapshot when 'cod' then 'cod-clearing' when 'card' then 'card-clearing' else null end;
  end if;
  select ledger_account_id into product_account from accounting.posting_account_mappings where organization_id=oid and purpose_key='product-sales';
  select ledger_account_id into delivery_account from accounting.posting_account_mappings where organization_id=oid and purpose_key='delivery-revenue';
  select ledger_account_id into discount_account from accounting.posting_account_mappings where organization_id=oid and purpose_key='sales-discounts';
  if debit_account is null or product_account is null or delivery_account is null or discount_account is null then raise exception 'Finance-approved posting account mapping is incomplete.'; end if;
  if payment.method_kind_snapshot='cod' and payment.evidence_state_key<>'collected' then raise exception 'Collected COD evidence is required.'; end if;
  if payment.method_kind_snapshot<>'cod' and payment.evidence_state_key<>'verified' then raise exception 'Verified payment evidence is required.'; end if;
  debit_total:=cs.grand_total_amount+o.discount_amount; credit_total:=o.gross_product_amount+cs.delivery_charge_amount;
  if debit_total<=0 or round(debit_total,2)<>round(credit_total,2) then raise exception 'Completed sale posting is not balanced.'; end if;
  sequence_value:=nextval('accounting.journal_reference_sequence'); ref:='JRN-'||extract(year from cs.completed_at)::integer||'-'||lpad(sequence_value::text,6,'0');
  insert into accounting.journal_entries(id,organization_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,actor_id,description,
    journal_reference,total_debit,total_credit,posting_source,posted_at)
  values(gen_random_uuid(),oid,cs.currency_code,'completed-sale',cs.id::text,'completed-sale:'||cs.id::text,cs.completed_at,null,
    'Completed sale '||o.external_reference,ref,debit_total,credit_total,'system:completed-sale',statement_timestamp()) returning id into journal_id;
  line_no:=line_no+1; insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)
    values(oid,journal_id,line_no,debit_account,cs.grand_total_amount,cs.grand_total_amount,0,'Payment or receivable for '||o.external_reference);
  if o.discount_amount>0 then line_no:=line_no+1; insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)
    values(oid,journal_id,line_no,discount_account,o.discount_amount,o.discount_amount,0,'Traceable sales discounts for '||o.external_reference); end if;
  line_no:=line_no+1; insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)
    values(oid,journal_id,line_no,product_account,-o.gross_product_amount,0,o.gross_product_amount,'Gross product sales for '||o.external_reference);
  if cs.delivery_charge_amount>0 then line_no:=line_no+1; insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)
    values(oid,journal_id,line_no,delivery_account,-cs.delivery_charge_amount,0,cs.delivery_charge_amount,'Delivery revenue for '||o.external_reference); end if;
  if (select round(coalesce(sum(debit_amount),0),2) from accounting.journal_lines where journal_entry_id=journal_id)<>(select round(coalesce(sum(credit_amount),0),2) from accounting.journal_lines where journal_entry_id=journal_id) then raise exception 'Journal lines are not balanced.'; end if;
  return journal_id;
exception when unique_violation then
  return (select id from accounting.journal_entries where source_namespace='completed-sale' and source_reference=p_completed_sale_id::text);
end$$;
revoke all on function accounting.post_completed_sale(uuid) from public,anon,authenticated;

create or replace function accounting.post_completed_sale_trigger()
returns trigger language plpgsql security definer set search_path='' as $$begin perform accounting.post_completed_sale(new.id);return new;end$$;
revoke all on function accounting.post_completed_sale_trigger() from public,anon,authenticated;
create trigger completed_sale_accounting_posting after insert on sales.completed_sales for each row execute function accounting.post_completed_sale_trigger();

create or replace function public.admin_completed_sale_journals()
returns jsonb language sql stable security definer set search_path='' as $$
select case when public.reyon_admin_role() is not null then coalesce(jsonb_agg(jsonb_build_object(
  'id',j.id,'reference',j.journal_reference,'postingDate',j.posted_at,'sourceModule',j.source_namespace,'sourceReference',j.source_reference,
  'totalDebit',j.total_debit,'totalCredit',j.total_credit,'postingSource',j.posting_source,'description',j.description,
  'lines',(select jsonb_agg(jsonb_build_object('accountCode',a.code,'accountName',a.display_name,'debit',l.debit_amount,'credit',l.credit_amount,'memo',l.memo) order by l.line_number) from accounting.journal_lines l join accounting.ledger_accounts a on a.id=l.ledger_account_id where l.journal_entry_id=j.id)
) order by j.posted_at desc),'[]'::jsonb) else null end from accounting.journal_entries j where j.source_namespace='completed-sale';$$;
revoke all on function public.admin_completed_sale_journals() from public,anon;
grant execute on function public.admin_completed_sale_journals() to authenticated;

create or replace function public.admin_posting_account_mappings()
returns jsonb language sql stable security definer set search_path='' as $$
select case when public.reyon_admin_role() is not null then coalesce(jsonb_agg(jsonb_build_object(
  'purpose',m.purpose_key,'ledgerAccountId',m.ledger_account_id,'accountCode',a.code,'accountName',a.display_name
) order by m.purpose_key),'[]'::jsonb) else null end
from accounting.posting_account_mappings m join accounting.ledger_accounts a on a.id=m.ledger_account_id;$$;
revoke all on function public.admin_posting_account_mappings() from public,anon;
grant execute on function public.admin_posting_account_mappings() to authenticated;

comment on function accounting.post_completed_sale(uuid) is 'Idempotent, configuration-gated double-entry posting for the existing Completed sale event; no COGS posting.';
