-- Sprint 21D: immutable weighted-average valuation and Completed-sale COGS.

create table inventory.valuation_events(
 id uuid primary key default gen_random_uuid(),movement_line_id uuid not null unique references inventory.movement_lines(id)on delete restrict,
 source_namespace text not null,source_reference text not null,valuation_method text not null default'weighted-average',
 quantity_delta numeric(20,6)not null,unit_cost_amount numeric(20,6)not null,total_value_delta numeric(20,6)not null,
 gross_unit_cost_amount numeric(20,6),discount_unit_amount numeric(20,6),previous_quantity numeric(20,6)not null,
 previous_inventory_value numeric(20,6)not null,previous_wac numeric(20,6),resulting_quantity numeric(20,6)not null,
 resulting_inventory_value numeric(20,6)not null,resulting_wac numeric(20,6),occurred_at timestamptz not null,recorded_at timestamptz not null default statement_timestamp(),
 check(valuation_method='weighted-average'),check(quantity_delta<>0),check(unit_cost_amount>0),
 check((quantity_delta>0 and total_value_delta>0)or(quantity_delta<0 and total_value_delta<0)),
 check(gross_unit_cost_amount is null or gross_unit_cost_amount>=unit_cost_amount),check(discount_unit_amount is null or discount_unit_amount>=0),
 check(previous_quantity>=0 and previous_inventory_value>=0 and resulting_quantity>=0 and resulting_inventory_value>=0)
);
create table inventory.valuation_positions(
 stock_item_id uuid not null references inventory.stock_items(id)on delete restrict,location_id uuid not null references organization.locations(id)on delete restrict,
 quantity numeric(20,6)not null,value_amount numeric(20,6)not null,weighted_average_cost numeric(20,6),last_event_id uuid not null references inventory.valuation_events(id)on delete restrict,
 updated_at timestamptz not null default statement_timestamp(),primary key(stock_item_id,location_id),
 check(quantity>=0 and value_amount>=0),check((quantity=0 and weighted_average_cost is null)or(quantity>0 and weighted_average_cost>0))
);
create table accounting.posting_exceptions(
 id uuid primary key default gen_random_uuid(),source_namespace text not null,source_reference text not null,exception_key text not null,
 detail text not null,occurred_at timestamptz not null default statement_timestamp(),unique(source_namespace,source_reference,exception_key),
 check(btrim(detail)<>'')
);
create trigger valuation_events_immutable before update or delete on inventory.valuation_events for each row execute function inventory.prevent_ledger_mutation();
create trigger posting_exceptions_immutable before update or delete on accounting.posting_exceptions for each row execute function accounting.prevent_evidence_mutation();
alter table inventory.valuation_events enable row level security;alter table inventory.valuation_positions enable row level security;alter table accounting.posting_exceptions enable row level security;
revoke all on inventory.valuation_events,inventory.valuation_positions,accounting.posting_exceptions from public,anon,authenticated;
grant all on inventory.valuation_events,inventory.valuation_positions,accounting.posting_exceptions to service_role;

create or replace function inventory.apply_weighted_average_event(
 p_movement_line_id uuid,p_unit_cost numeric,p_gross_unit_cost numeric default null,p_discount_unit numeric default null)
returns uuid language plpgsql security definer set search_path=''as $$
declare ml inventory.movement_lines%rowtype;m inventory.movements%rowtype;pos inventory.valuation_positions%rowtype;
 event_id uuid;delta_value numeric(20,6);new_qty numeric(20,6);new_value numeric(20,6);new_wac numeric(20,6);
begin
 if p_unit_cost is null or p_unit_cost<=0 then raise exception'Authoritative inventory unit cost must be positive.';end if;
 select *into ml from inventory.movement_lines where id=p_movement_line_id for update;
 if ml.id is null then raise exception'Inventory movement line not found.';end if;
 select *into m from inventory.movements where id=ml.movement_id;
 select *into pos from inventory.valuation_positions where stock_item_id=ml.stock_item_id and location_id=ml.location_id for update;
 if exists(select 1 from inventory.valuation_events where movement_line_id=ml.id)then return(select id from inventory.valuation_events where movement_line_id=ml.id);end if;
 if pos.stock_item_id is null then pos.quantity:=0;pos.value_amount:=0;pos.weighted_average_cost:=null;end if;
 if ml.quantity_delta>0 then delta_value:=round(ml.quantity_delta*p_unit_cost,6);
 else
  if pos.weighted_average_cost is null or pos.weighted_average_cost<=0 then raise exception'Authoritative weighted-average cost is missing.';end if;
  if pos.quantity<abs(ml.quantity_delta)then raise exception'Valued inventory quantity is insufficient.';end if;
  p_unit_cost:=pos.weighted_average_cost;delta_value:=-round(abs(ml.quantity_delta)*p_unit_cost,6);
 end if;
 new_qty:=round(pos.quantity+ml.quantity_delta,6);new_value:=round(pos.value_amount+delta_value,6);
 if new_qty<0 or new_value<0 then raise exception'Inventory valuation cannot become negative.';end if;
 new_wac:=case when new_qty=0 then null else round(new_value/new_qty,6)end;
 insert into inventory.valuation_events(movement_line_id,source_namespace,source_reference,quantity_delta,unit_cost_amount,total_value_delta,
  gross_unit_cost_amount,discount_unit_amount,previous_quantity,previous_inventory_value,previous_wac,resulting_quantity,resulting_inventory_value,resulting_wac,occurred_at)
 values(ml.id,m.source_namespace,m.source_reference,ml.quantity_delta,p_unit_cost,delta_value,p_gross_unit_cost,p_discount_unit,
  pos.quantity,pos.value_amount,pos.weighted_average_cost,new_qty,new_value,new_wac,m.occurred_at)returning id into event_id;
 insert into inventory.valuation_positions(stock_item_id,location_id,quantity,value_amount,weighted_average_cost,last_event_id)
 values(ml.stock_item_id,ml.location_id,new_qty,new_value,new_wac,event_id)
 on conflict(stock_item_id,location_id)do update set quantity=excluded.quantity,value_amount=excluded.value_amount,
  weighted_average_cost=excluded.weighted_average_cost,last_event_id=excluded.last_event_id,updated_at=statement_timestamp();
 return event_id;
end$$;
revoke all on function inventory.apply_weighted_average_event(uuid,numeric,numeric,numeric)from public,anon,authenticated;

create or replace function inventory.value_accepted_receipt()returns trigger language plpgsql security definer set search_path=''as $$
declare pol purchasing.purchase_order_lines%rowtype;ml_id uuid;gross numeric;net numeric;discount numeric;
begin
 if new.accepted_quantity<=0 then return new;end if;
 select *into pol from purchasing.purchase_order_lines where id=new.purchase_order_line_id;
 gross:=pol.unit_cost_amount;net:=round(purchasing.po_line_net(pol)/pol.quantity,6);discount:=round(gross-net,6);
 if net<=0 then raise exception'Accepted receipt has no positive authoritative net acquisition cost.';end if;
 select id into ml_id from inventory.movement_lines where movement_id=new.inventory_movement_id;
 perform inventory.apply_weighted_average_event(ml_id,net,gross,discount);return new;
end$$;
create trigger purchase_receipt_weighted_average after insert on purchasing.purchase_receipt_lines for each row execute function inventory.value_accepted_receipt();

create or replace function inventory.value_purchase_return()returns trigger language plpgsql security definer set search_path=''as $$
declare ml_id uuid;current_wac numeric;
begin
 if new.status_key<>'returned'or old.status_key='returned'then return new;end if;
 select ml.id,vp.weighted_average_cost into ml_id,current_wac from inventory.movement_lines ml
 left join inventory.valuation_positions vp on vp.stock_item_id=ml.stock_item_id and vp.location_id=ml.location_id
 where ml.movement_id=new.inventory_movement_id;
 if current_wac is null or current_wac<=0 then raise exception'Purchase return requires a positive authoritative weighted-average cost.';end if;
 perform inventory.apply_weighted_average_event(ml_id,current_wac,null,null);return new;
end$$;
create trigger purchase_return_weighted_average after update of status_key on purchasing.purchase_returns for each row execute function inventory.value_purchase_return();

alter table accounting.posting_account_mappings drop constraint posting_account_mappings_purpose_key_check;
alter table accounting.posting_account_mappings add constraint posting_account_mappings_purpose_key_check
 check(purpose_key in('product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales'));
update accounting.organization_profiles set posting_enabled=false,activated_at=null,activated_by=null;

create or replace function public.admin_save_posting_account_mapping(p_purpose text,p_ledger_account_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare oid uuid;required_class text;old_value jsonb;new_value jsonb;
begin
 if not accounting.can_configure()then raise exception'Finance configuration authority required.';end if;
 if p_purpose not in('product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales')then raise exception'Select a supported posting purpose.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Mapping reason is required.';end if;
 required_class:=case p_purpose when'sales-discounts'then'contra-revenue'when'inventory'then'asset'when'cost-of-sales'then'cogs'else'revenue'end;
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
 foreach cls in array array['asset','liability','equity','revenue','contra-revenue','cogs','expense']loop
  if not exists(select 1 from accounting.ledger_accounts where organization_id=oid and account_class=cls and is_active and approved_at is not null)then missing:=array_append(missing,cls||' account');end if;
 end loop;
 foreach kind in array array['cash','bank','mfs','card-clearing','cod-clearing']loop
  if not exists(select 1 from accounting.financial_accounts where organization_id=oid and account_kind=kind and is_active)then missing:=array_append(missing,kind||' financial account');end if;
 end loop;
 foreach purpose in array array['product-sales','delivery-revenue','sales-discounts','inventory','cost-of-sales']loop
  if not exists(select 1 from accounting.posting_account_mappings where organization_id=oid and purpose_key=purpose)then missing:=array_append(missing,purpose||' mapping');end if;
 end loop;
 select id into batch_id from accounting.opening_balance_batches where organization_id=oid and status_key in('draft','activated')order by(status_key='activated')desc,created_at desc limit 1;
 if batch_id is null then missing:=array_append(missing,'balanced opening balances with evidence');end if;
 if cardinality(missing)>0 then raise exception'Configuration incomplete: %',array_to_string(missing,', ');end if;
 if exists(select 1 from accounting.opening_balance_batches where id=batch_id and status_key='draft')then update accounting.opening_balance_batches set status_key='activated',activated_at=statement_timestamp(),activated_by=auth.uid()where id=batch_id;end if;
 update accounting.organization_profiles set posting_enabled=true,activated_at=statement_timestamp(),activated_by=auth.uid()where organization_id=oid;
 perform accounting.record_configuration_event('configuration-activated','organization-profile',null,jsonb_build_object('openingBalanceBatchId',batch_id),p_reason);
end$$;

create or replace function accounting.post_completed_sale_cogs(p_completed_sale_id uuid)returns uuid
language plpgsql security definer set search_path=''as $$
declare cs sales.completed_sales%rowtype;o sales.orders%rowtype;sale_movement uuid;journal_id uuid;line_record record;
 oid uuid;inventory_account uuid;cogs_account uuid;total_cost numeric(20,6):=0;line_no integer:=0;ref text;event_id uuid;
begin
 select *into cs from sales.completed_sales where id=p_completed_sale_id;if cs.id is null then raise exception'Completed sale not found.';end if;
 select id into journal_id from accounting.journal_entries where source_namespace='completed-sale-cogs'and source_reference=cs.id::text;
 if journal_id is not null then return journal_id;end if;
 select *into o from sales.orders where id=cs.order_id;oid:=o.organization_id;
 if not exists(select 1 from accounting.organization_profiles where organization_id=oid and posting_enabled and activated_at is not null and valuation_method='weighted-average')then
  insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('completed-sale-cogs',cs.id::text,'configuration-inactive','Accounting configuration is inactive or incomplete.')on conflict do nothing;return null;end if;
 select m.ledger_account_id into inventory_account from accounting.posting_account_mappings m join accounting.ledger_accounts a on a.id=m.ledger_account_id and a.organization_id=m.organization_id where m.organization_id=oid and m.purpose_key='inventory'and a.is_active and a.approved_at is not null and a.account_class='asset';
 select m.ledger_account_id into cogs_account from accounting.posting_account_mappings m join accounting.ledger_accounts a on a.id=m.ledger_account_id and a.organization_id=m.organization_id where m.organization_id=oid and m.purpose_key='cost-of-sales'and a.is_active and a.approved_at is not null and a.account_class='cogs';
 if inventory_account is null or cogs_account is null then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('completed-sale-cogs',cs.id::text,'account-mapping-missing','Exactly one active approved Inventory and Cost of Sales mapping is required.')on conflict do nothing;return null;end if;
 select id into sale_movement from inventory.movements where source_namespace='sales-order'and source_reference=o.external_reference and movement_type_key='sale';
 if sale_movement is null then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('completed-sale-cogs',cs.id::text,'sold-movement-missing','Authoritative sold inventory movement is missing.')on conflict do nothing;return null;end if;
 for line_record in select ml.*,vp.weighted_average_cost from inventory.movement_lines ml left join inventory.valuation_positions vp on vp.stock_item_id=ml.stock_item_id and vp.location_id=ml.location_id where ml.movement_id=sale_movement order by ml.line_number loop
  if line_record.quantity_delta>=0 or line_record.weighted_average_cost is null or line_record.weighted_average_cost<=0 or(select quantity from inventory.valuation_positions where stock_item_id=line_record.stock_item_id and location_id=line_record.location_id)<abs(line_record.quantity_delta)then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('completed-sale-cogs',cs.id::text,'valuation-missing','Positive authoritative weighted-average cost and sufficient valued quantity are required for sold inventory.')on conflict do nothing;return null;end if;
  total_cost:=total_cost+round(abs(line_record.quantity_delta)*line_record.weighted_average_cost,6);
 end loop;
 if total_cost<=0 then insert into accounting.posting_exceptions(source_namespace,source_reference,exception_key,detail)values('completed-sale-cogs',cs.id::text,'valuation-invalid','COGS must be positive.')on conflict do nothing;return null;end if;
 ref:='JRN-'||extract(year from cs.completed_at)::integer||'-'||lpad(nextval('accounting.journal_reference_sequence')::text,6,'0');
 insert into accounting.journal_entries(id,organization_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,description,journal_reference,total_debit,total_credit,posting_source,posted_at)
 values(gen_random_uuid(),oid,cs.currency_code,'completed-sale-cogs',cs.id::text,'completed-sale-cogs:'||cs.id::text,cs.completed_at,'COGS for completed sale '||o.external_reference,ref,round(total_cost,2),round(total_cost,2),'system:completed-sale-cogs',statement_timestamp())returning id into journal_id;
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(oid,journal_id,1,cogs_account,round(total_cost,2),round(total_cost,2),0,'Weighted-average COGS for '||o.external_reference);
 insert into accounting.journal_lines(organization_id,journal_entry_id,line_number,ledger_account_id,signed_amount,debit_amount,credit_amount,memo)values(oid,journal_id,2,inventory_account,-round(total_cost,2),0,round(total_cost,2),'Inventory relieved for '||o.external_reference);
 for line_record in select ml.*,vp.weighted_average_cost from inventory.movement_lines ml join inventory.valuation_positions vp on vp.stock_item_id=ml.stock_item_id and vp.location_id=ml.location_id where ml.movement_id=sale_movement order by ml.line_number loop
  event_id:=inventory.apply_weighted_average_event(line_record.id,line_record.weighted_average_cost,null,null);
 end loop;
 return journal_id;
exception when unique_violation then return(select id from accounting.journal_entries where source_namespace='completed-sale-cogs'and source_reference=p_completed_sale_id::text);end$$;
revoke all on function accounting.post_completed_sale_cogs(uuid)from public,anon,authenticated;
create or replace function accounting.post_completed_sale_cogs_trigger()returns trigger language plpgsql security definer set search_path=''as $$begin perform accounting.post_completed_sale_cogs(new.id);return new;end$$;
create trigger completed_sale_cogs_posting after insert on sales.completed_sales for each row execute function accounting.post_completed_sale_cogs_trigger();

create or replace function public.admin_cogs_postings()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.reyon_admin_role()is not null then jsonb_build_object(
 'postings',coalesce((select jsonb_agg(jsonb_build_object('journalReference',j.journal_reference,'sourceSaleId',j.source_reference,'orderReference',o.external_reference,'postedAt',j.posted_at,'amount',j.total_debit,
  'quantity',coalesce((select sum(abs(ve.quantity_delta))from inventory.valuation_events ve join inventory.movement_lines ml on ml.id=ve.movement_line_id join inventory.movements m on m.id=ml.movement_id where m.source_namespace='sales-order'and m.source_reference=o.external_reference),0),
  'weightedAverageCost',case when coalesce((select sum(abs(ve.quantity_delta))from inventory.valuation_events ve join inventory.movement_lines ml on ml.id=ve.movement_line_id join inventory.movements m on m.id=ml.movement_id where m.source_namespace='sales-order'and m.source_reference=o.external_reference),0)>0 then j.total_debit/(select sum(abs(ve.quantity_delta))from inventory.valuation_events ve join inventory.movement_lines ml on ml.id=ve.movement_line_id join inventory.movements m on m.id=ml.movement_id where m.source_namespace='sales-order'and m.source_reference=o.external_reference)end)order by j.posted_at desc)
  from accounting.journal_entries j join sales.completed_sales cs on cs.id::text=j.source_reference join sales.orders o on o.id=cs.order_id where j.source_namespace='completed-sale-cogs'),'[]'::jsonb),
 'exceptions',coalesce((select jsonb_agg(jsonb_build_object('sourceSaleId',source_reference,'key',exception_key,'detail',detail,'occurredAt',occurred_at)order by occurred_at desc)from accounting.posting_exceptions where source_namespace='completed-sale-cogs'),'[]'::jsonb))else null end$$;
revoke all on function public.admin_cogs_postings()from public,anon;grant execute on function public.admin_cogs_postings()to authenticated;

comment on table inventory.valuation_events is'Immutable valuation evidence linked one-to-one to authoritative physical movement lines.';
comment on table inventory.valuation_positions is'Rebuildable weighted-average projection; immutable valuation_events remain the audit authority.';
comment on function accounting.post_completed_sale_cogs(uuid)is'Idempotent Completed-sale COGS posting from authoritative sold quantity and WAC; no physical movement is created.';
notify pgrst,'reload schema';
