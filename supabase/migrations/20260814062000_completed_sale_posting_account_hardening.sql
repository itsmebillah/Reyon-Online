-- Sprint 21C hardening: deterministic Finance-approved account selection.

create or replace function accounting.completed_sale_debit_account(
  p_organization_id uuid,
  p_method_kind text,
  p_method_name text,
  p_method_key text
) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  selected_account uuid;
  matching_accounts integer;
begin
  if p_method_kind = 'mobile' then
    select count(*), min(f.ledger_account_id::text)::uuid
      into matching_accounts, selected_account
    from accounting.financial_accounts f
    join accounting.ledger_accounts a
      on a.id = f.ledger_account_id and a.organization_id = f.organization_id
    where f.organization_id = p_organization_id
      and f.is_active and f.account_kind = 'mfs'
      and a.is_active and a.approved_at is not null
      and lower(regexp_replace(coalesce(f.provider_name, ''), '[^a-z0-9]+', '', 'g')) in (
        lower(regexp_replace(p_method_name, '[^a-z0-9]+', '', 'g')),
        lower(regexp_replace(p_method_key, '[^a-z0-9]+', '', 'g'))
      );
  elsif p_method_kind in ('cod', 'card') then
    select count(*), min(f.ledger_account_id::text)::uuid
      into matching_accounts, selected_account
    from accounting.financial_accounts f
    join accounting.ledger_accounts a
      on a.id = f.ledger_account_id and a.organization_id = f.organization_id
    where f.organization_id = p_organization_id
      and f.is_active
      and f.account_kind = case p_method_kind
        when 'cod' then 'cod-clearing'
        when 'card' then 'card-clearing'
      end
      and a.is_active and a.approved_at is not null;
  else
    raise exception 'The completed-sale payment state has no approved posting account rule.';
  end if;

  if matching_accounts <> 1 then
    raise exception 'Exactly one active approved payment/receivable account must match the completed sale.';
  end if;
  return selected_account;
end;
$$;
revoke all on function accounting.completed_sale_debit_account(uuid, text, text, text)
  from public, anon, authenticated;

create or replace function accounting.post_completed_sale(p_completed_sale_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cs sales.completed_sales%rowtype;
  o sales.orders%rowtype;
  payment sales.order_payment_details%rowtype;
  oid uuid;
  debit_account uuid;
  product_account uuid;
  delivery_account uuid;
  discount_account uuid;
  journal_id uuid;
  ref text;
  sequence_value bigint;
  debit_total numeric(18,2);
  credit_total numeric(18,2);
  line_no integer := 0;
begin
  select * into cs from sales.completed_sales where id = p_completed_sale_id;
  if cs.id is null then raise exception 'Completed sale not found.'; end if;
  select id into journal_id from accounting.journal_entries
    where source_namespace = 'completed-sale' and source_reference = cs.id::text;
  if journal_id is not null then return journal_id; end if;

  select * into o from sales.orders where id = cs.order_id;
  select * into payment from sales.order_payment_details where order_id = cs.order_id;
  oid := o.organization_id;
  if not exists (
    select 1 from accounting.organization_profiles
    where organization_id = oid and posting_enabled and activated_at is not null
  ) then raise exception 'Accounting configuration is inactive or incomplete.'; end if;

  debit_account := accounting.completed_sale_debit_account(
    oid, payment.method_kind_snapshot, payment.method_name_snapshot,
    payment.method_key_snapshot
  );
  select m.ledger_account_id into product_account
  from accounting.posting_account_mappings m
  join accounting.ledger_accounts a on a.id = m.ledger_account_id and a.organization_id = m.organization_id
  where m.organization_id = oid and m.purpose_key = 'product-sales'
    and a.is_active and a.approved_at is not null and a.account_class = 'revenue';
  select m.ledger_account_id into delivery_account
  from accounting.posting_account_mappings m
  join accounting.ledger_accounts a on a.id = m.ledger_account_id and a.organization_id = m.organization_id
  where m.organization_id = oid and m.purpose_key = 'delivery-revenue'
    and a.is_active and a.approved_at is not null and a.account_class = 'revenue';
  select m.ledger_account_id into discount_account
  from accounting.posting_account_mappings m
  join accounting.ledger_accounts a on a.id = m.ledger_account_id and a.organization_id = m.organization_id
  where m.organization_id = oid and m.purpose_key = 'sales-discounts'
    and a.is_active and a.approved_at is not null and a.account_class = 'contra-revenue';
  if product_account is null or delivery_account is null or discount_account is null then
    raise exception 'Finance-approved posting account mapping is incomplete.';
  end if;
  if payment.method_kind_snapshot = 'cod' and payment.evidence_state_key <> 'collected' then
    raise exception 'Collected COD evidence is required.';
  end if;
  if payment.method_kind_snapshot <> 'cod' and payment.evidence_state_key <> 'verified' then
    raise exception 'Verified payment evidence is required.';
  end if;

  debit_total := cs.grand_total_amount + o.discount_amount;
  credit_total := o.gross_product_amount + cs.delivery_charge_amount;
  if debit_total <= 0 or round(debit_total, 2) <> round(credit_total, 2) then
    raise exception 'Completed sale posting is not balanced.';
  end if;
  sequence_value := nextval('accounting.journal_reference_sequence');
  ref := 'JRN-' || extract(year from cs.completed_at)::integer || '-' || lpad(sequence_value::text, 6, '0');
  insert into accounting.journal_entries(
    id, organization_id, currency_code, source_namespace, source_reference,
    idempotency_key, occurred_at, actor_id, description, journal_reference,
    total_debit, total_credit, posting_source, posted_at
  ) values (
    gen_random_uuid(), oid, cs.currency_code, 'completed-sale', cs.id::text,
    'completed-sale:' || cs.id::text, cs.completed_at, null,
    'Completed sale ' || o.external_reference, ref, debit_total, credit_total,
    'system:completed-sale', statement_timestamp()
  ) returning id into journal_id;
  line_no := line_no + 1;
  insert into accounting.journal_lines(
    organization_id, journal_entry_id, line_number, ledger_account_id,
    signed_amount, debit_amount, credit_amount, memo
  ) values (
    oid, journal_id, line_no, debit_account, cs.grand_total_amount,
    cs.grand_total_amount, 0, 'Payment or receivable for ' || o.external_reference
  );
  if o.discount_amount > 0 then
    line_no := line_no + 1;
    insert into accounting.journal_lines(
      organization_id, journal_entry_id, line_number, ledger_account_id,
      signed_amount, debit_amount, credit_amount, memo
    ) values (
      oid, journal_id, line_no, discount_account, o.discount_amount,
      o.discount_amount, 0, 'Traceable sales discounts for ' || o.external_reference
    );
  end if;
  line_no := line_no + 1;
  insert into accounting.journal_lines(
    organization_id, journal_entry_id, line_number, ledger_account_id,
    signed_amount, debit_amount, credit_amount, memo
  ) values (
    oid, journal_id, line_no, product_account, -o.gross_product_amount,
    0, o.gross_product_amount, 'Gross product sales for ' || o.external_reference
  );
  if cs.delivery_charge_amount > 0 then
    line_no := line_no + 1;
    insert into accounting.journal_lines(
      organization_id, journal_entry_id, line_number, ledger_account_id,
      signed_amount, debit_amount, credit_amount, memo
    ) values (
      oid, journal_id, line_no, delivery_account, -cs.delivery_charge_amount,
      0, cs.delivery_charge_amount, 'Delivery revenue for ' || o.external_reference
    );
  end if;
  if (select round(coalesce(sum(debit_amount), 0), 2) from accounting.journal_lines where journal_entry_id = journal_id)
    <> (select round(coalesce(sum(credit_amount), 0), 2) from accounting.journal_lines where journal_entry_id = journal_id)
  then raise exception 'Journal lines are not balanced.'; end if;
  return journal_id;
exception when unique_violation then
  select id into journal_id from accounting.journal_entries
    where source_namespace = 'completed-sale' and source_reference = p_completed_sale_id::text;
  if journal_id is null then raise; end if;
  return journal_id;
end;
$$;

comment on function accounting.completed_sale_debit_account(uuid, text, text, text) is
  'Requires one deterministic active Finance-approved payment or receivable account for Completed-sale posting.';
comment on function accounting.post_completed_sale(uuid) is
  'Idempotent, configuration-gated double-entry posting for the existing Completed sale event; no COGS or later accounting milestones.';

notify pgrst, 'reload schema';
