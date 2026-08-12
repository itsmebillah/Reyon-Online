-- REYON Business OS: append-only manual payment verification operations.
create table payments.manual_verification_events(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references sales.orders(id)on delete restrict,
 previous_state_key text not null,new_state_key text not null,evidence_reference text not null,
 note text,occurred_at timestamptz not null default statement_timestamp(),actor_id uuid,
 constraint manual_verification_state_approved check(new_state_key in('verified','rejected','pending-verification')),
 constraint manual_verification_reference_present check(btrim(evidence_reference)<>''),
 constraint manual_verification_rejection_note check(new_state_key<>'rejected'or(note is not null and btrim(note)<>''))
);
create index manual_verification_order_idx on payments.manual_verification_events(order_id,occurred_at);
create trigger manual_verification_prevent_mutation before update or delete on payments.manual_verification_events for each row execute function payments.prevent_evidence_mutation();
alter table payments.manual_verification_events enable row level security;revoke all on payments.manual_verification_events from public,anon,authenticated;grant all on payments.manual_verification_events to service_role;

create or replace function public.admin_pending_manual_payments()returns jsonb language sql stable security definer set search_path=''as $$select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object('orderId',o.id,'orderNumber',o.external_reference,'orderState',o.current_state_key,'customerName',a.full_name,'method',p.method_name_snapshot,'amount',o.total_amount,'currency',o.currency_code,'reference',p.transaction_reference,'paymentState',p.evidence_state_key,'submittedAt',p.created_at)order by p.created_at),'[]'::jsonb)else null end from sales.order_payment_details p join sales.orders o on o.id=p.order_id left join sales.order_addresses a on a.order_id=o.id where p.method_kind_snapshot<>'cod'and p.evidence_state_key in('pending-verification','rejected')$$;
revoke all on function public.admin_pending_manual_payments()from public,anon;grant execute on function public.admin_pending_manual_payments()to authenticated;

create or replace function public.admin_decide_manual_payment(p_order_id uuid,p_decision text,p_note text default null)returns void language plpgsql security definer set search_path=''as $$declare p sales.order_payment_details%rowtype;begin
 if public.reyon_admin_role()not in('super-admin','admin')then raise exception'Payment verification permission required.';end if;
 if p_decision not in('verified','rejected')then raise exception'Invalid payment decision.';end if;
 if p_decision='rejected'and nullif(btrim(p_note),'')is null then raise exception'Rejection reason is required.';end if;
 select*into p from sales.order_payment_details where order_id=p_order_id for update;
 if p.order_id is null or p.method_kind_snapshot='cod'then raise exception'Manual payment evidence not found.';end if;
 if p.evidence_state_key<>'pending-verification'then raise exception'Payment evidence is no longer pending.';end if;
 update sales.order_payment_details set evidence_state_key=p_decision where order_id=p_order_id;
 insert into payments.manual_verification_events(order_id,previous_state_key,new_state_key,evidence_reference,note,actor_id)values(p_order_id,p.evidence_state_key,p_decision,p.transaction_reference,case when p_note is null then null else btrim(p_note)end,auth.uid());
 if p_decision='rejected'then insert into sales.order_review_cases(order_id,review_type_key,internal_note)values(p_order_id,'payment-mismatch','Manual payment evidence was rejected: '||btrim(p_note))on conflict do nothing;end if;
end$$;
revoke all on function public.admin_decide_manual_payment(uuid,text,text)from public,anon;grant execute on function public.admin_decide_manual_payment(uuid,text,text)to authenticated;

create or replace function public.resubmit_manual_payment_evidence(p_order_reference text,p_phone text,p_reference text)returns void language plpgsql security definer set search_path=''as $$declare v_order_id uuid;old_state text;begin
 if nullif(btrim(p_reference),'')is null then raise exception'Transaction reference is required.';end if;
 select o.id into v_order_id from sales.orders o join sales.order_addresses a on a.order_id=o.id join sales.order_payment_details p on p.order_id=o.id where o.external_reference=upper(btrim(p_order_reference))and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g')and p.method_kind_snapshot<>'cod'and p.evidence_state_key='rejected';
 if v_order_id is null then raise exception'Rejected payment evidence could not be verified.';end if;
 select evidence_state_key into old_state from sales.order_payment_details where order_id=v_order_id for update;
 update sales.order_payment_details set transaction_reference=btrim(p_reference),evidence_state_key='pending-verification'where order_id=v_order_id;
 insert into payments.manual_verification_events(order_id,previous_state_key,new_state_key,evidence_reference,note)values(v_order_id,old_state,'pending-verification',btrim(p_reference),'Customer resubmitted corrected evidence');
end$$;
revoke all on function public.resubmit_manual_payment_evidence(text,text,text)from public;grant execute on function public.resubmit_manual_payment_evidence(text,text,text)to anon,authenticated;
