-- Sprint 21E: accepted-receipt supplier payables and purchase-return credits.

create table accounting.supplier_payable_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  supplier_id uuid not null references purchasing.suppliers(id) on delete restrict,
  purchase_order_id uuid not null references purchasing.purchase_orders(id) on delete restrict,
  purchase_receipt_line_id uuid references purchasing.purchase_receipt_lines(id) on delete restrict,
  purchase_return_id uuid references purchasing.purchase_returns(id) on delete restrict,
  valuation_event_id uuid not null unique references inventory.valuation_events(id) on delete restrict,
  journal_entry_id uuid not null unique references accounting.journal_entries(id) on delete restrict,
  event_type text not null check (event_type in ('payable-created','supplier-credit')),
  source_namespace text not null,
  source_reference text not null,
  amount numeric(18,2) not null check (amount > 0),
  signed_payable_amount numeric(18,2) not null,
  actor_system_source text not null check (btrim(actor_system_source) <> ''),
  posted_at timestamptz not null default statement_timestamp(),
  unique (source_namespace,source_reference,event_type),
  check (
    (event_type = 'payable-created' and purchase_receipt_line_id is not null and purchase_return_id is null and signed_payable_amount = amount)
    or
    (event_type = 'supplier-credit' and purchase_return_id is not null and signed_payable_amount = -amount)
  )
);

create trigger supplier_payable_events_immutable before update or delete on accounting.supplier_payable_events
for each row execute function accounting.prevent_evidence_mutation();
alter table accounting.supplier_payable_events enable row level security;
revoke all on accounting.supplier_payable_events from public,anon,authenticated;
grant all on accounting.supplier_payable_events to service_role;

alter table accounting.posting_account_mappings drop constraint posting_account_mappings_purpose_key_check;
alter table accounting.posting_account_mappings add constraint posting_account_mappings_purpose_key_check
  check (purpose_key in ('product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales','accounts-payable'));

update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null;

create or replace function public.admin_save_posting_account_mapping(p_purpose text,p_ledger_account_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare oid uuid;required_class text;old_value jsonb;new_value jsonb;
begin
 if not accounting.can_configure()then raise exception'Finance configuration authority required.';end if;
 if p_purpose not in('product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales','accounts-payable')then raise exception'Select a supported posting purpose.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Mapping reason is required.';end if;
 required_class:=case p_purpose when'sales-discounts'then'contra-revenue'when'inventory'then'asset'when'cost-of-sales'then'cogs'when'accounts-payable'then'liability'else'revenue'end;
 select id into oid from organization.organizations where code='reyon-online';
 if not exists(select 1 from accounting.ledger_accounts where id=p_ledger_account_id and organization_id=oid and is_active and approved_at is not null and account_class=required_class)then raise exception'Select an approved active % account.',required_class;end if;
 select to_jsonb(m)into old_value from accounting.posting_account_mappings m where organization_id=oid and purpose_key=p_purpose;
 insert into accounting.posting_account_mappings(organization_id,purpose_key,ledger_account_id,configured_by)values(oid,p_purpose,p_ledger_account_id,auth.uid())
 on conflict(organization_id,purpose_key)do update set ledger_account_id=excluded.ledger_account_id,configured_at=statement_timestamp(),configured_by=auth.uid();
 update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null where organization_id=oid;
 select to_jsonb(m)into new_value from accounting.posting_account_mappings m where organization_id=oid and purpose_key=p_purpose;
 perform accounting.record_configuration_event('posting-account-mapped',p_purpose,old_value,new_value,p_reason);
end$$;

create or replace function public.admin_activate_accounting_configuration(p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare oid uuid;batch_id uuid;missing text[]:=array[]::text[];cls text;kind text;purpose text;
begin
 if not accounting.can_configure()then raise exception'Finance activation authority required.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Activation reason is required.';end if;
 select id into oid from organization.organizations where code='reyon-online';
 if not exists(select 1 from accounting.organization_profiles where organization_id=oid and legal_entity_name is not null and legal_entity_type is not null and fiscal_year_start_month is not null)then missing:=array_append(missing,'legal/fiscal profile');end if;
 if not exists(select 1 from accounting.finance_approvers where organization_id=oid and revoked_at is null)then missing:=array_append(missing,'Finance approver');end if;
 foreach cls in array array['asset','liability','equity','revenue','contra-revenue','cogs','expense']loop if not exists(select 1 from accounting.ledger_accounts where organization_id=oid and account_class=cls and is_active and approved_at is not null)then missing:=array_append(missing,cls||' account');end if;end loop;
 foreach kind in array array['cash','bank','mfs','card-clearing','cod-clearing']loop if not exists(select 1 from accounting.financial_accounts where organization_id=oid and account_kind=kind and is_active)then missing:=array_append(missing,kind||' financial account');end if;end loop;
 foreach purpose in array array['product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales','accounts-payable']loop if not exists(select 1 from accounting.posting_account_mappings where organization_id=oid and purpose_key=purpose)then missing:=array_append(missing,purpose||' mapping');end if;end loop;
 select id into batch_id from accounting.opening_balance_batches where organization_id=oid and status_key in('draft','activated')order by(status_key='activated')desc,created_at desc limit 1;
 if batch_id is null then missing:=array_append(missing,'balanced opening balances with evidence');end if;
 if cardinality(missing)>0 then raise exception'Configuration incomplete: %',array_to_string(missing,', ');end if;
 if exists(select 1 from accounting.opening_balance_batches where id=batch_id and status_key='draft')then update accounting.opening_balance_batches set status_key='activated',activated_at=statement_timestamp(),activated_by=auth.uid()where id=batch_id;end if;
 update accounting.organization_profiles set posting_enabled=true,activated_at=statement_timestamp(),activated_by=auth.uid()where organization_id=oid;
 perform accounting.record_configuration_event('configuration-activated','organization-profile',null,jsonb_build_object('openingBalanceBatchId',batch_id),p_reason);
end$$;

create or replace function accounting.payable_accounts(p_organization_id uuid,out inventory_account uuid,out payable_account uuid)
returns record language plpgsql stable security definer set search_path=''as $$
begin
 select m.ledger_account_id into inventory_account from accounting.posting_account_mappings m join accounting.ledger_accounts a on a.id=m.ledger_account_id and a.organization_id=m.organization_id where m.organization_id=p_organization_id and m.purpose_key='inventory'and a.is_active and a.approved_at is not null and a.account_class='asset';
 select m.ledger_account_id into payable_account from accounting.posting_account_mappings m join accounting.ledger_accounts a on a.id=m.ledger_account_id and a.organization_id=m.organization_id where m.organization_id=p_organization_id and m.purpose_key='accounts-payable'and a.is_active and a.approved_at is not null and a.account_class='liability';
end$$;
revoke all on function accounting.payable_accounts(uuid)from public,anon,authenticated;

create or replace function accounting.post_accepted_receipt_payable(p_receipt_line_id uuid)returns uuid
language plpgsql security definer set search_path=''as $$
declare rl purchasing.purchase_receipt_lines%rowtype;r purchasing.purchase_receipts%rowtype;po purchasing.purchase_orders%rowtype;
 ve inventory.valuation_events%rowtype;inventory_account uuid;payable_account uuid;journal_id uuid;ref text;amount numeric(18,2);movement_line_id uuid;
begin
 select *into rl from purchasing.purchase_receipt_lines where id=p_receipt_line_id;if rl.id is null then raise exception'Purchase receipt line not found.';end if;
 select id into journal_id from accounting.journal_entries where source_namespace='accepted-purchase-receipt'and source_reference=rl.id::text;if journal_id is not null then return journal_id;end if;
 if rl.accepted_quantity<=0 or rl.inventory_movement_id is null then return null;end if;
 select *into r from purchasing.purchase_receipts where id=rl.purchase_receipt_id;select *into po from purchasing.purchase_orders where id=r.purchase_order_id;
 if not exists(select 1 from accounting.organization_profiles where organization_id=po.organization_id and posting_enabled and activated_at is not null)then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('accepted-purchase-receipt',rl.id::text,'configuration-inactive','Accounting configuration is inactive or incomplete.')on conflict do nothing;return null;end if;
 select ml.id into movement_line_id from inventory.movement_lines ml where ml.movement_id=rl.inventory_movement_id;
 select *into ve from inventory.valuation_events where movement_line_id=movement_line_id;
 if ve.id is null or ve.quantity_delta<>rl.accepted_quantity or ve.total_value_delta<=0 then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('accepted-purchase-receipt',rl.id::text,'valuation-missing','Accepted receipt requires one matching positive authoritative valuation event.')on conflict do nothing;return null;end if;
 select a.inventory_account,a.payable_account into inventory_account,payable_account from accounting.payable_accounts(po.organization_id)a;
 if inventory_account is null or payable_account is null then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('accepted-purchase-receipt',rl.id::text,'account-mapping-missing','Exactly one active approved Inventory and Accounts Payable mapping is required.')on conflict do nothing;return null;end if;
 amount:=round(ve.total_value_delta,2);if amount<=0 then raise exception'Supplier payable amount must be positive.';end if;
 ref:='JRN-'||extract(year from r.received_at)::integer||'-'||lpad(nextval('accounting.journal_reference_sequence')::text,6,'0');
 insert into accounting.journal_entries(organization_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,actor_id,description,journal_reference,total_debit,total_credit,posting_source,posted_at)
 values(po.organization_id,po.currency_code,'accepted-purchase-receipt',rl.id::text,'accepted-purchase-receipt:'||rl.id::text,r.received_at,r.received_by,'Accepted receipt payable '||r.receipt_reference,ref,amount,amount,'system:accepted-receipt',statement_timestamp())returning id into journal_id;
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(po.organization_id,journal_id,1,inventory_account,amount,amount,0,'Accepted inventory '||r.receipt_reference);
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(po.organization_id,journal_id,2,payable_account,-amount,0,amount,'Supplier payable '||po.external_reference);
 insert into accounting.supplier_payable_events(organization_id,supplier_id,purchase_order_id,purchase_receipt_line_id,valuation_event_id,journal_entry_id,event_type,source_namespace,source_reference,amount,signed_payable_amount,actor_system_source,posted_at)
 values(po.organization_id,po.supplier_id,po.id,rl.id,ve.id,journal_id,'payable-created','accepted-purchase-receipt',rl.id::text,amount,amount,'system:accepted-receipt',statement_timestamp());
 return journal_id;
exception when unique_violation then return(select id from accounting.journal_entries where source_namespace='accepted-purchase-receipt'and source_reference=p_receipt_line_id::text);end$$;
revoke all on function accounting.post_accepted_receipt_payable(uuid)from public,anon,authenticated;

create or replace function accounting.post_purchase_return_credit(p_purchase_return_id uuid)returns uuid
language plpgsql security definer set search_path=''as $$
declare pr purchasing.purchase_returns%rowtype;rl purchasing.purchase_receipt_lines%rowtype;r purchasing.purchase_receipts%rowtype;po purchasing.purchase_orders%rowtype;
 ve inventory.valuation_events%rowtype;inventory_account uuid;payable_account uuid;journal_id uuid;ref text;amount numeric(18,2);movement_line_id uuid;
begin
 select *into pr from purchasing.purchase_returns where id=p_purchase_return_id;if pr.id is null then raise exception'Purchase return not found.';end if;
 select id into journal_id from accounting.journal_entries where source_namespace='purchase-return-credit'and source_reference=pr.id::text;if journal_id is not null then return journal_id;end if;
 if pr.status_key not in('returned','completed')or pr.inventory_movement_id is null then return null;end if;
 select *into rl from purchasing.purchase_receipt_lines where id=pr.purchase_receipt_line_id;select *into r from purchasing.purchase_receipts where id=rl.purchase_receipt_id;select *into po from purchasing.purchase_orders where id=r.purchase_order_id;
 if not exists(select 1 from accounting.organization_profiles where organization_id=po.organization_id and posting_enabled and activated_at is not null)then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('purchase-return-credit',pr.id::text,'configuration-inactive','Accounting configuration is inactive or incomplete.')on conflict do nothing;return null;end if;
 select ml.id into movement_line_id from inventory.movement_lines ml where ml.movement_id=pr.inventory_movement_id;select *into ve from inventory.valuation_events where movement_line_id=movement_line_id;
 if ve.id is null or abs(ve.quantity_delta)<>pr.quantity or ve.total_value_delta>=0 then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('purchase-return-credit',pr.id::text,'valuation-missing','Purchase return requires one matching negative authoritative current-WAC valuation event.')on conflict do nothing;return null;end if;
 select a.inventory_account,a.payable_account into inventory_account,payable_account from accounting.payable_accounts(po.organization_id)a;
 if inventory_account is null or payable_account is null then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('purchase-return-credit',pr.id::text,'account-mapping-missing','Exactly one active approved Inventory and Accounts Payable mapping is required.')on conflict do nothing;return null;end if;
 amount:=round(abs(ve.total_value_delta),2);if amount<=0 then raise exception'Supplier credit amount must be positive.';end if;
 ref:='JRN-'||extract(year from statement_timestamp())::integer||'-'||lpad(nextval('accounting.journal_reference_sequence')::text,6,'0');
 insert into accounting.journal_entries(organization_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,actor_id,description,journal_reference,total_debit,total_credit,posting_source,posted_at)
 values(po.organization_id,po.currency_code,'purchase-return-credit',pr.id::text,'purchase-return-credit:'||pr.id::text,statement_timestamp(),pr.requested_by,'Purchase return supplier credit '||pr.return_reference,ref,amount,amount,'system:purchase-return',statement_timestamp())returning id into journal_id;
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(po.organization_id,journal_id,1,payable_account,amount,amount,0,'Supplier credit '||pr.return_reference);
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(po.organization_id,journal_id,2,inventory_account,-amount,0,amount,'Inventory returned '||pr.return_reference);
 insert into accounting.supplier_payable_events(organization_id,supplier_id,purchase_order_id,purchase_receipt_line_id,purchase_return_id,valuation_event_id,journal_entry_id,event_type,source_namespace,source_reference,amount,signed_payable_amount,actor_system_source,posted_at)
 values(po.organization_id,po.supplier_id,po.id,rl.id,pr.id,ve.id,journal_id,'supplier-credit','purchase-return-credit',pr.id::text,amount,-amount,'system:purchase-return',statement_timestamp());
 return journal_id;
exception when unique_violation then return(select id from accounting.journal_entries where source_namespace='purchase-return-credit'and source_reference=p_purchase_return_id::text);end$$;
revoke all on function accounting.post_purchase_return_credit(uuid)from public,anon,authenticated;

create or replace function accounting.post_accepted_receipt_payable_trigger()returns trigger language plpgsql security definer set search_path=''as $$begin perform accounting.post_accepted_receipt_payable(new.id);return new;end$$;
revoke all on function accounting.post_accepted_receipt_payable_trigger()from public,anon,authenticated;
create trigger zz_purchase_receipt_supplier_payable after insert on purchasing.purchase_receipt_lines for each row execute function accounting.post_accepted_receipt_payable_trigger();
create or replace function accounting.post_purchase_return_credit_trigger()returns trigger language plpgsql security definer set search_path=''as $$begin if new.status_key='returned'and old.status_key<>'returned'then perform accounting.post_purchase_return_credit(new.id);end if;return new;end$$;
revoke all on function accounting.post_purchase_return_credit_trigger()from public,anon,authenticated;
create trigger zz_purchase_return_supplier_credit after update of status_key on purchasing.purchase_returns for each row execute function accounting.post_purchase_return_credit_trigger();

create or replace function accounting.retry_supplier_payable_postings()returns void
language plpgsql security definer set search_path=''as $$
declare item record;
begin
 for item in select id from purchasing.purchase_receipt_lines where accepted_quantity>0 order by id loop perform accounting.post_accepted_receipt_payable(item.id);end loop;
 for item in select id from purchasing.purchase_returns where status_key in('returned','completed')and inventory_movement_id is not null order by id loop perform accounting.post_purchase_return_credit(item.id);end loop;
end$$;
revoke all on function accounting.retry_supplier_payable_postings()from public,anon,authenticated;

create or replace function accounting.retry_supplier_payables_on_activation()returns trigger
language plpgsql security definer set search_path=''as $$
begin
 if new.posting_enabled and new.activated_at is not null and not coalesce(old.posting_enabled,false)then perform accounting.retry_supplier_payable_postings();end if;
 return new;
end$$;
revoke all on function accounting.retry_supplier_payables_on_activation()from public,anon,authenticated;
create trigger accounting_activation_supplier_payable_retry after update of posting_enabled on accounting.organization_profiles
for each row execute function accounting.retry_supplier_payables_on_activation();

-- Existing accepted receipts/returns are assessed without fabricating journals while
-- configuration is inactive. Their immutable exceptions remain audit evidence and
-- the activation trigger retries the source events idempotently after Finance maps AP.
do $$declare item record;begin
 for item in select id from purchasing.purchase_receipt_lines where accepted_quantity>0 order by id loop perform accounting.post_accepted_receipt_payable(item.id);end loop;
 for item in select id from purchasing.purchase_returns where status_key in('returned','completed')and inventory_movement_id is not null order by id loop perform accounting.post_purchase_return_credit(item.id);end loop;
end$$;

create or replace function public.admin_supplier_payable_accounting()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.reyon_admin_role()is not null then jsonb_build_object(
 'events',coalesce((select jsonb_agg(jsonb_build_object('eventType',e.event_type,'amount',e.amount,'signedAmount',e.signed_payable_amount,'postedAt',e.posted_at,'supplierName',s.display_name,'poReference',po.external_reference,'receiptReference',r.receipt_reference,'returnReference',pr.return_reference,'journalReference',j.journal_reference,'sourceReference',e.source_reference)order by e.posted_at desc)from accounting.supplier_payable_events e join purchasing.suppliers s on s.id=e.supplier_id join purchasing.purchase_orders po on po.id=e.purchase_order_id left join purchasing.purchase_receipt_lines rl on rl.id=e.purchase_receipt_line_id left join purchasing.purchase_receipts r on r.id=rl.purchase_receipt_id left join purchasing.purchase_returns pr on pr.id=e.purchase_return_id join accounting.journal_entries j on j.id=e.journal_entry_id),'[]'::jsonb),
 'balances',coalesce((select jsonb_agg(jsonb_build_object('supplierId',s.id,'supplierName',s.display_name,'outstandingAmount',b.balance)order by s.display_name)from(select supplier_id,sum(signed_payable_amount)balance from accounting.supplier_payable_events group by supplier_id)b join purchasing.suppliers s on s.id=b.supplier_id),'[]'::jsonb),
 'exceptions',coalesce((select jsonb_agg(jsonb_build_object('sourceNamespace',x.source_namespace,'sourceReference',x.source_reference,'key',x.exception_key,'detail',x.detail,'occurredAt',x.occurred_at)order by x.occurred_at desc)from accounting.posting_exceptions x where x.source_namespace in('accepted-purchase-receipt','purchase-return-credit')and not exists(select 1 from accounting.supplier_payable_events e where e.source_namespace=x.source_namespace and e.source_reference=x.source_reference)),'[]'::jsonb)
 )else null end$$;
revoke all on function public.admin_supplier_payable_accounting()from public,anon;
grant execute on function public.admin_supplier_payable_accounting()to authenticated;

comment on table accounting.supplier_payable_events is'Immutable accounting linkage for accepted-receipt payables and current-WAC purchase-return supplier credits; operational supplier payments remain separate.';
