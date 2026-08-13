-- Sprint 20: manual, provider-neutral supplier settlement and append-only verification.

create sequence purchasing.supplier_payment_reference_sequence;

create table purchasing.supplier_payments(
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid not null references purchasing.suppliers(id)on delete restrict,
 payment_reference text not null unique,
 amount numeric(18,2)not null check(amount>0),
 currency_code text not null default'BDT'check(currency_code='BDT'),
 payment_date date not null,
 method_key text not null,
 provider_reference text not null,
 evidence_reference text not null,
 note text,
 recorded_by uuid not null,
 recorded_by_role text not null,
 recorded_at timestamptz not null default statement_timestamp(),
 constraint supplier_payment_method_present check(btrim(method_key)<>''),
 constraint supplier_payment_provider_reference_present check(btrim(provider_reference)<>''),
 constraint supplier_payment_evidence_present check(btrim(evidence_reference)<>'')
);
create table purchasing.supplier_payment_allocations(
 id uuid primary key default gen_random_uuid(),
 supplier_payment_id uuid not null references purchasing.supplier_payments(id)on delete restrict,
 purchase_order_id uuid not null references purchasing.purchase_orders(id)on delete restrict,
 amount numeric(18,2)not null check(amount>0),
 unique(supplier_payment_id,purchase_order_id)
);
create table purchasing.supplier_payment_events(
 id uuid primary key default gen_random_uuid(),supplier_payment_id uuid not null references purchasing.supplier_payments(id)on delete restrict,
 sequence_number integer not null,from_state_key text,to_state_key text not null check(to_state_key in('pending-verification','verified','rejected')),
 reason text,actor_id uuid not null,actor_role text not null,occurred_at timestamptz not null default statement_timestamp(),
 unique(supplier_payment_id,sequence_number)
);
create table purchasing.purchase_payable_events(
 id uuid primary key default gen_random_uuid(),purchase_order_id uuid not null references purchasing.purchase_orders(id)on delete restrict,
 sequence_number integer not null,event_key text not null check(event_key in('credit-terms-set','disputed','dispute-resolved')),
 is_credit_purchase boolean,due_on date,reason text,actor_id uuid not null,actor_role text not null,
 occurred_at timestamptz not null default statement_timestamp(),unique(purchase_order_id,sequence_number)
);
create unique index supplier_payment_provider_reference_unique on purchasing.supplier_payments(supplier_id,provider_reference);
create unique index supplier_payment_evidence_reference_unique on purchasing.supplier_payments(evidence_reference);
create index supplier_payment_allocations_order_idx on purchasing.supplier_payment_allocations(purchase_order_id);
create trigger supplier_payments_immutable before update or delete on purchasing.supplier_payments for each row execute function purchasing.prevent_transition_mutation();
create trigger supplier_payment_allocations_immutable before update or delete on purchasing.supplier_payment_allocations for each row execute function purchasing.prevent_transition_mutation();
create trigger supplier_payment_events_immutable before update or delete on purchasing.supplier_payment_events for each row execute function purchasing.prevent_transition_mutation();
create trigger purchase_payable_events_immutable before update or delete on purchasing.purchase_payable_events for each row execute function purchasing.prevent_transition_mutation();
alter table purchasing.supplier_payments enable row level security;alter table purchasing.supplier_payment_allocations enable row level security;
alter table purchasing.supplier_payment_events enable row level security;alter table purchasing.purchase_payable_events enable row level security;
revoke all on purchasing.supplier_payments,purchasing.supplier_payment_allocations,purchasing.supplier_payment_events,purchasing.purchase_payable_events from public,anon,authenticated;
grant all on purchasing.supplier_payments,purchasing.supplier_payment_allocations,purchasing.supplier_payment_events,purchasing.purchase_payable_events to service_role;

create or replace function purchasing.purchase_order_eligible_payable(p_order_id uuid)
returns numeric language sql stable set search_path=''as $$
 with line_values as(
  select l.id,l.quantity,case when l.quantity>0 then purchasing.po_line_net(l)/l.quantity else 0 end unit_net,
   coalesce((select sum(rl.accepted_quantity)from purchasing.purchase_receipt_lines rl where rl.purchase_order_line_id=l.id),0)accepted,
   coalesce((select sum(pr.quantity)from purchasing.purchase_returns pr join purchasing.purchase_receipt_lines rl on rl.id=pr.purchase_receipt_line_id
    where rl.purchase_order_line_id=l.id and pr.status_key in('returned','completed')),0)returned
  from purchasing.purchase_order_lines l where l.purchase_order_id=p_order_id),
 basis as(select coalesce(sum(purchasing.po_line_net(l)),0)line_total,(purchasing.po_totals(p_order_id)->>'total')::numeric po_total
  from purchasing.purchase_order_lines l where l.purchase_order_id=p_order_id)
 select greatest(0,round(coalesce(sum(greatest(0,v.accepted-v.returned)*v.unit_net),0)*
  case when b.line_total>0 then b.po_total/b.line_total else 0 end,2))from line_values v cross join basis b group by b.line_total,b.po_total;
$$;

create or replace function purchasing.supplier_payment_state(p_payment_id uuid)
returns text language sql stable set search_path=''as $$select e.to_state_key from purchasing.supplier_payment_events e where e.supplier_payment_id=p_payment_id order by e.sequence_number desc limit 1$$;
create or replace function purchasing.purchase_order_verified_paid(p_order_id uuid)
returns numeric language sql stable set search_path=''as $$select coalesce(sum(a.amount),0)from purchasing.supplier_payment_allocations a
 where a.purchase_order_id=p_order_id and purchasing.supplier_payment_state(a.supplier_payment_id)='verified'$$;
create or replace function purchasing.purchase_order_committed_paid(p_order_id uuid,p_excluding uuid default null)
returns numeric language sql stable set search_path=''as $$select coalesce(sum(a.amount),0)from purchasing.supplier_payment_allocations a
 where a.purchase_order_id=p_order_id and a.supplier_payment_id is distinct from p_excluding
 and purchasing.supplier_payment_state(a.supplier_payment_id)in('pending-verification','verified')$$;

create or replace function public.admin_record_supplier_payment(p_order_id uuid,p_amount numeric,p_payment_date date,p_method text,
 p_provider_reference text,p_evidence_reference text,p_note text default null)
returns uuid language plpgsql security definer set search_path=''as $$
declare role_key text;po purchasing.purchase_orders%rowtype;eligible numeric;committed numeric;payment_id uuid;reference text;
begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if p_amount is null or p_amount<=0 then raise exception'Payment amount must be positive.';end if;
 if p_payment_date is null or p_payment_date>current_date then raise exception'Payment date is invalid.';end if;
 if nullif(btrim(p_method),'')is null or nullif(btrim(p_provider_reference),'')is null or nullif(btrim(p_evidence_reference),'')is null then raise exception'Payment method, transaction/reference, and evidence are required.';end if;
 select *into po from purchasing.purchase_orders where id=p_order_id for update;
 if po.id is null or po.status_key not in('approved','ordered','partially-received','fully-received','closed')then raise exception'Purchase order is not payable.';end if;
 eligible:=purchasing.purchase_order_eligible_payable(po.id);committed:=purchasing.purchase_order_committed_paid(po.id);
 if p_amount>eligible-committed then raise exception'Payment exceeds the eligible outstanding payable.';end if;
 payment_id:=gen_random_uuid();reference:='SP-'||extract(year from statement_timestamp()at time zone'Asia/Dhaka')::integer||'-'||lpad(nextval('purchasing.supplier_payment_reference_sequence')::text,6,'0');
 insert into purchasing.supplier_payments(id,supplier_id,payment_reference,amount,payment_date,method_key,provider_reference,evidence_reference,note,recorded_by,recorded_by_role)
 values(payment_id,po.supplier_id,reference,p_amount,p_payment_date,btrim(p_method),btrim(p_provider_reference),btrim(p_evidence_reference),nullif(btrim(p_note),''),auth.uid(),role_key);
 insert into purchasing.supplier_payment_allocations(supplier_payment_id,purchase_order_id,amount)values(payment_id,po.id,p_amount);
 insert into purchasing.supplier_payment_events(supplier_payment_id,sequence_number,to_state_key,actor_id,actor_role)values(payment_id,1,'pending-verification',auth.uid(),role_key);
 return payment_id;
end$$;

create or replace function public.admin_verify_supplier_payment(p_payment_id uuid,p_target text,p_reason text default null)
returns void language plpgsql security definer set search_path=''as $$
declare role_key text;payment purchasing.supplier_payments%rowtype;current_state text;allocation purchasing.supplier_payment_allocations%rowtype;eligible numeric;committed numeric;n integer;
begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin financial verification authority required.';end if;
 if p_target not in('verified','rejected')then raise exception'Payment decision is invalid.';end if;
 if p_target='rejected'and nullif(btrim(p_reason),'')is null then raise exception'Rejection reason is required.';end if;
 select *into payment from purchasing.supplier_payments where id=p_payment_id for share;if payment.id is null then raise exception'Payment not found.';end if;
 current_state:=purchasing.supplier_payment_state(payment.id);if current_state<>'pending-verification'then raise exception'This payment has already been decided.';end if;
 select *into allocation from purchasing.supplier_payment_allocations where supplier_payment_id=payment.id;
 if p_target='verified'then
  perform 1 from purchasing.purchase_orders where id=allocation.purchase_order_id for update;
  eligible:=purchasing.purchase_order_eligible_payable(allocation.purchase_order_id);committed:=purchasing.purchase_order_committed_paid(allocation.purchase_order_id,payment.id);
  if allocation.amount>eligible-committed then raise exception'Payment no longer fits the eligible outstanding payable.';end if;
 end if;
 select coalesce(max(sequence_number),0)+1 into n from purchasing.supplier_payment_events where supplier_payment_id=payment.id;
 insert into purchasing.supplier_payment_events(supplier_payment_id,sequence_number,from_state_key,to_state_key,reason,actor_id,actor_role)
 values(payment.id,n,current_state,p_target,nullif(btrim(p_reason),''),auth.uid(),role_key);
end$$;

create or replace function public.admin_set_purchase_credit_terms(p_order_id uuid,p_is_credit boolean,p_due_on date,p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare role_key text;n integer;
begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin financial authority required.';end if;
 if p_is_credit and p_due_on is null then raise exception'Due date is required for a credit purchase.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Credit terms reason is required.';end if;
 if not exists(select 1 from purchasing.purchase_orders where id=p_order_id and status_key not in('draft','pending-approval','cancelled','rejected'))then raise exception'Purchase order is not eligible for payment terms.';end if;
 select coalesce(max(sequence_number),0)+1 into n from purchasing.purchase_payable_events where purchase_order_id=p_order_id;
 insert into purchasing.purchase_payable_events(purchase_order_id,sequence_number,event_key,is_credit_purchase,due_on,reason,actor_id,actor_role)
 values(p_order_id,n,'credit-terms-set',p_is_credit,case when p_is_credit then p_due_on else null end,btrim(p_reason),auth.uid(),role_key);
end$$;

create or replace function public.admin_set_purchase_payable_dispute(p_order_id uuid,p_disputed boolean,p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare role_key text;n integer;
begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin financial authority required.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Dispute reason is required.';end if;
 select coalesce(max(sequence_number),0)+1 into n from purchasing.purchase_payable_events where purchase_order_id=p_order_id;
 insert into purchasing.purchase_payable_events(purchase_order_id,sequence_number,event_key,reason,actor_id,actor_role)
 values(p_order_id,n,case when p_disputed then'disputed'else'dispute-resolved'end,btrim(p_reason),auth.uid(),role_key);
end$$;

create or replace function public.admin_supplier_payment_queue()returns jsonb language plpgsql stable security definer set search_path=''as $$
begin
 if public.reyon_admin_role()is null then raise exception'Administrator access required.';end if;
 return jsonb_build_object('payables',coalesce((select jsonb_agg(jsonb_build_object(
  'poId',po.id,'poReference',po.external_reference,'supplierName',s.display_name,'poTotal',(purchasing.po_totals(po.id)->>'total')::numeric,
  'eligiblePayable',purchasing.purchase_order_eligible_payable(po.id),'paidAmount',purchasing.purchase_order_verified_paid(po.id),
  'outstandingAmount',greatest(0,purchasing.purchase_order_eligible_payable(po.id)-purchasing.purchase_order_verified_paid(po.id)),
  'pendingAmount',purchasing.purchase_order_committed_paid(po.id)-purchasing.purchase_order_verified_paid(po.id),
  'isCreditPurchase',coalesce((select e.is_credit_purchase from purchasing.purchase_payable_events e where e.purchase_order_id=po.id and e.event_key='credit-terms-set'order by e.sequence_number desc limit 1),false),
  'dueOn',(select e.due_on from purchasing.purchase_payable_events e where e.purchase_order_id=po.id and e.event_key='credit-terms-set'order by e.sequence_number desc limit 1),
  'isDisputed',coalesce((select e.event_key='disputed'from purchasing.purchase_payable_events e where e.purchase_order_id=po.id and e.event_key in('disputed','dispute-resolved')order by e.sequence_number desc limit 1),false),
  'status',case when coalesce((select e.event_key='disputed'from purchasing.purchase_payable_events e where e.purchase_order_id=po.id and e.event_key in('disputed','dispute-resolved')order by e.sequence_number desc limit 1),false)then'disputed'
   when purchasing.purchase_order_verified_paid(po.id)>=purchasing.purchase_order_eligible_payable(po.id)and purchasing.purchase_order_eligible_payable(po.id)>0 then'paid'
   when coalesce((select e.due_on from purchasing.purchase_payable_events e where e.purchase_order_id=po.id and e.event_key='credit-terms-set'order by e.sequence_number desc limit 1),current_date)>=current_date then case when purchasing.purchase_order_verified_paid(po.id)>0 then'partially-paid'else'unpaid'end
   when purchasing.purchase_order_verified_paid(po.id)>0 then'overdue'else'overdue'end)order by po.created_at desc)
  from purchasing.purchase_orders po join purchasing.suppliers s on s.id=po.supplier_id where po.status_key in('approved','ordered','partially-received','fully-received','closed')),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'paymentReference',p.payment_reference,'supplierName',s.display_name,
  'poReference',po.external_reference,'amount',p.amount,'currency',p.currency_code,'paymentDate',p.payment_date,'method',p.method_key,
  'providerReference',p.provider_reference,'evidenceReference',p.evidence_reference,'note',p.note,'recordedByRole',p.recorded_by_role,
  'recordedAt',p.recorded_at,'status',purchasing.supplier_payment_state(p.id),'history',coalesce((select jsonb_agg(jsonb_build_object(
   'sequence',e.sequence_number,'fromState',e.from_state_key,'toState',e.to_state_key,'reason',e.reason,'actorRole',e.actor_role,'occurredAt',e.occurred_at)order by e.sequence_number)
   from purchasing.supplier_payment_events e where e.supplier_payment_id=p.id),'[]'::jsonb))order by p.recorded_at desc)
  from purchasing.supplier_payments p join purchasing.suppliers s on s.id=p.supplier_id join purchasing.supplier_payment_allocations a on a.supplier_payment_id=p.id
  join purchasing.purchase_orders po on po.id=a.purchase_order_id),'[]'::jsonb));
end$$;

revoke all on function public.admin_record_supplier_payment(uuid,numeric,date,text,text,text,text)from public,anon;
revoke all on function public.admin_verify_supplier_payment(uuid,text,text)from public,anon;
revoke all on function public.admin_set_purchase_credit_terms(uuid,boolean,date,text)from public,anon;
revoke all on function public.admin_set_purchase_payable_dispute(uuid,boolean,text)from public,anon;
revoke all on function public.admin_supplier_payment_queue()from public,anon;
grant execute on function public.admin_record_supplier_payment(uuid,numeric,date,text,text,text,text)to authenticated;
grant execute on function public.admin_verify_supplier_payment(uuid,text,text)to authenticated;
grant execute on function public.admin_set_purchase_credit_terms(uuid,boolean,date,text)to authenticated;
grant execute on function public.admin_set_purchase_payable_dispute(uuid,boolean,text)to authenticated;
grant execute on function public.admin_supplier_payment_queue()to authenticated;

comment on table purchasing.supplier_payments is'Immutable manual supplier payment evidence; verification is a separate append-only event stream.';
