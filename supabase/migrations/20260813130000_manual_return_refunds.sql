-- Sprint 19: proportional manual refund preparation, execution evidence, and adjustment document.

create sequence payments.refund_adjustment_number_sequence;
create table payments.return_refunds(
 id uuid primary key default gen_random_uuid(),return_request_id uuid not null unique references reverse_logistics.return_requests(id)on delete restrict,
 adjustment_number bigint not null default nextval('payments.refund_adjustment_number_sequence')unique,
 product_refund_amount numeric(18,2)not null check(product_refund_amount>=0),delivery_refund_amount numeric(18,2)not null default 0 check(delivery_refund_amount>=0),
 total_refund_amount numeric(18,2)generated always as(product_refund_amount+delivery_refund_amount)stored,
 currency_code text not null,method_key text not null check(method_key in('bkash','nagad','rocket','card','cod')),
 status_key text not null default'pending'check(status_key in('pending','refunded')),
 delivery_refund_reason text,prepared_at timestamptz not null default statement_timestamp(),prepared_by uuid not null,
 executed_at timestamptz,executed_by uuid,execution_reference text,execution_evidence text,
 constraint refund_currency_format check(currency_code~'^[A-Z]{3}$'),
 constraint delivery_refund_reason_required check(delivery_refund_amount=0 or(delivery_refund_reason is not null and btrim(delivery_refund_reason)<>'')),
 constraint refund_execution_evidence_complete check(status_key<>'refunded'or(executed_at is not null and executed_by is not null and execution_reference is not null and btrim(execution_reference)<>''and execution_evidence is not null and btrim(execution_evidence)<>''))
);
create table payments.return_refund_events(
 id uuid primary key default gen_random_uuid(),refund_id uuid not null references payments.return_refunds(id)on delete restrict,
 previous_status text,new_status text not null,occurred_at timestamptz not null default statement_timestamp(),actor_id uuid not null,actor_role_key text not null,reason_note text not null,
 constraint refund_event_note_present check(btrim(reason_note)<>'')
);
create trigger return_refunds_prevent_delete before delete on payments.return_refunds for each row execute function payments.prevent_evidence_mutation();
create trigger refund_events_prevent_mutation before update or delete on payments.return_refund_events for each row execute function payments.prevent_evidence_mutation();
alter table payments.return_refunds enable row level security;alter table payments.return_refund_events enable row level security;
revoke all on payments.return_refunds,payments.return_refund_events from public,anon,authenticated;grant all on payments.return_refunds,payments.return_refund_events to service_role;
grant usage,select on sequence payments.refund_adjustment_number_sequence to service_role;

create or replace function public.admin_prepare_return_refund(p_request_id uuid,p_refund_delivery boolean default false,p_delivery_reason text default null)
returns uuid language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;rl reverse_logistics.return_lines%rowtype;ol sales.order_lines%rowtype;o sales.orders%rowtype;
 inspected numeric;product_amount numeric(18,2);delivery_amount numeric(18,2):=0;collected numeric(18,2);prior numeric(18,2);method text;refund_id uuid;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Refund approval requires Admin or Super Admin.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;if rr.id is null or rr.current_state_key<>'inspected'then raise exception'Return must be fully inspected before refund preparation.';end if;
 select *into rl from reverse_logistics.return_lines where return_request_id=rr.id;select *into ol from sales.order_lines where id=rl.order_line_id;select *into o from sales.orders where id=rr.order_id for update;
 select coalesce(sum(quantity),0)into inspected from reverse_logistics.inspection_dispositions where return_line_id=rl.id;
 product_amount:=round((o.subtotal_amount*(ol.quantity*ol.unit_price_amount/nullif(o.gross_product_amount,0)))*(inspected/ol.quantity),2);
 product_amount:=greatest(coalesce(product_amount,0),0);
 if p_refund_delivery then
  if rr.reason_key not in('wrong-product','damaged','defective','missing-item')then raise exception'Delivery charge refund requires a genuine REYON-fault reason.';end if;
  if nullif(btrim(p_delivery_reason),'')is null then raise exception'Delivery charge refund reason is required.';end if;delivery_amount:=o.delivery_amount;
 end if;
 select method_key_snapshot into method from sales.order_payment_details where order_id=o.id;
 select coalesce(sum(amount),0)into collected from payments.receipts where order_id=o.id;
 select coalesce(sum(r.total_refund_amount),0)into prior from payments.return_refunds r join reverse_logistics.return_requests prior_rr on prior_rr.id=r.return_request_id where prior_rr.order_id=o.id and r.status_key in('pending','refunded');
 if product_amount+delivery_amount<=0 then raise exception'Refund amount must be positive.';end if;
 if product_amount+delivery_amount+prior>collected then raise exception'Refund cannot exceed actual collected payment after prior refunds.';end if;
 insert into payments.return_refunds(return_request_id,product_refund_amount,delivery_refund_amount,currency_code,method_key,delivery_refund_reason,prepared_by)
 values(rr.id,product_amount,delivery_amount,o.currency_code,method,case when delivery_amount>0 then btrim(p_delivery_reason)else null end,auth.uid())returning id into refund_id;
 insert into payments.return_refund_events(refund_id,new_status,actor_id,actor_role_key,reason_note)values(refund_id,'pending',auth.uid(),role_key,'Proportional refund prepared from immutable order commercial snapshot.');
 perform reverse_logistics.append_return_event(rr.id,'refund-pending','Manual refund prepared; execution evidence required.',auth.uid(),role_key);return refund_id;
end$$;

create or replace function public.admin_execute_return_refund(p_request_id uuid,p_execution_reference text,p_execution_evidence text)
returns void language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;r payments.return_refunds%rowtype;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Refund execution requires Admin or Super Admin.';end if;
 if nullif(btrim(p_execution_reference),'')is null or nullif(btrim(p_execution_evidence),'')is null then raise exception'Refund reference and evidence are required.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;if rr.id is null or rr.current_state_key<>'refund-pending'then raise exception'Refund is not pending.';end if;
 select *into r from payments.return_refunds where return_request_id=rr.id for update;if r.id is null or r.status_key<>'pending'then raise exception'Pending refund record not found.';end if;
 update payments.return_refunds set status_key='refunded',executed_at=statement_timestamp(),executed_by=auth.uid(),execution_reference=btrim(p_execution_reference),execution_evidence=btrim(p_execution_evidence)where id=r.id;
 insert into payments.return_refund_events(refund_id,previous_status,new_status,actor_id,actor_role_key,reason_note)values(r.id,'pending','refunded',auth.uid(),role_key,'Manual refund execution evidence recorded.');
 perform reverse_logistics.append_return_event(rr.id,'refunded','Manual refund completed. Adjustment #'||r.adjustment_number::text,auth.uid(),role_key);
end$$;

revoke all on function public.admin_prepare_return_refund(uuid,boolean,text),public.admin_execute_return_refund(uuid,text,text)from public,anon;
grant execute on function public.admin_prepare_return_refund(uuid,boolean,text),public.admin_execute_return_refund(uuid,text,text)to authenticated;

create or replace function public.admin_return_queue()returns jsonb language sql stable security definer set search_path=''as $$
select case when public.is_reyon_admin()then coalesce(jsonb_agg(jsonb_build_object(
 'id',rr.id,'orderNumber',o.external_reference,'state',rr.current_state_key,'reason',rr.reason_key,'condition',rr.condition_key,'shippingResponsibility',rr.shipping_responsibility_key,'note',rr.customer_note,'requestedAt',rr.requested_at,
 'lineNumber',ol.line_number,'productName',ol.product_name_snapshot,'variantLabel',ol.variant_label_snapshot,'quantity',rl.quantity,
 'receivedQuantity',(select coalesce(sum(rc.quantity),0)from reverse_logistics.return_receipts rc where rc.return_line_id=rl.id),'inspectedQuantity',(select coalesce(sum(d.quantity),0)from reverse_logistics.inspection_dispositions d where d.return_line_id=rl.id),
 'refund',(select jsonb_build_object('adjustmentNumber',r.adjustment_number,'productAmount',r.product_refund_amount,'deliveryAmount',r.delivery_refund_amount,'totalAmount',r.total_refund_amount,'currency',r.currency_code,'method',r.method_key,'status',r.status_key)from payments.return_refunds r where r.return_request_id=rr.id),
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('kind',e.evidence_kind,'reference',e.asset_reference)),'[]'::jsonb)from reverse_logistics.return_evidence e where e.return_request_id=rr.id)
)order by rr.requested_at),'[]'::jsonb)else null end from reverse_logistics.return_requests rr join sales.orders o on o.id=rr.order_id join reverse_logistics.return_lines rl on rl.return_request_id=rr.id join sales.order_lines ol on ol.id=rl.order_line_id where rr.current_state_key not in('refunded','rejected','withdrawn','cancelled');$$;
