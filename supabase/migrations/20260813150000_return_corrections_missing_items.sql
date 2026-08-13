-- Sprint 19 closeout: append-only exceptional corrections and non-physical Missing Item claims.

create table reverse_logistics.non_physical_claim_resolutions(
 id uuid primary key default gen_random_uuid(),return_request_id uuid not null unique references reverse_logistics.return_requests(id)on delete restrict,
 return_line_id uuid not null references reverse_logistics.return_lines(id)on delete restrict,quantity numeric(20,6)not null check(quantity>0),
 resolution_note text not null,resolved_at timestamptz not null default statement_timestamp(),resolved_by uuid not null,resolved_by_role text not null,
 constraint non_physical_note_present check(btrim(resolution_note)<>'')
);

create table reverse_logistics.exceptional_corrections(
 id uuid primary key default gen_random_uuid(),correction_key uuid not null unique,
 target_kind text not null check(target_kind in('return-request','return-receipt','inspection-disposition','refund','inventory-movement','sale')),
 target_id uuid not null,previous_value jsonb not null,corrected_value jsonb not null,reason text not null,
 actor_id uuid not null,actor_role_key text not null,occurred_at timestamptz not null default statement_timestamp(),
 constraint exceptional_correction_reason_present check(btrim(reason)<>''),constraint exceptional_correction_changes_value check(previous_value<>corrected_value)
);
create unique index exceptional_corrections_duplicate_idx on reverse_logistics.exceptional_corrections(target_kind,target_id,md5(corrected_value::text),md5(reason));
create trigger non_physical_resolutions_prevent_mutation before update or delete on reverse_logistics.non_physical_claim_resolutions for each row execute function sales.prevent_transition_mutation();
create trigger exceptional_corrections_prevent_mutation before update or delete on reverse_logistics.exceptional_corrections for each row execute function sales.prevent_transition_mutation();
alter table reverse_logistics.non_physical_claim_resolutions enable row level security;alter table reverse_logistics.exceptional_corrections enable row level security;
revoke all on reverse_logistics.non_physical_claim_resolutions,reverse_logistics.exceptional_corrections from public,anon,authenticated;
grant all on reverse_logistics.non_physical_claim_resolutions,reverse_logistics.exceptional_corrections to service_role;

create or replace function public.admin_accept_missing_item_claim(p_request_id uuid,p_note text)
returns uuid language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;rl reverse_logistics.return_lines%rowtype;resolution_id uuid;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin or Super Admin authority required.';end if;
 if nullif(btrim(p_note),'')is null then raise exception'Non-physical claim resolution note is required.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;
 if rr.id is null or rr.reason_key<>'missing-item'or rr.current_state_key<>'approved'then raise exception'Only an approved Missing Item claim can use non-physical resolution.';end if;
 select *into rl from reverse_logistics.return_lines where return_request_id=rr.id;
 insert into reverse_logistics.non_physical_claim_resolutions(return_request_id,return_line_id,quantity,resolution_note,resolved_by,resolved_by_role)
 values(rr.id,rl.id,rl.quantity,btrim(p_note),auth.uid(),role_key)returning id into resolution_id;
 perform reverse_logistics.append_return_event(rr.id,'inspected','Missing Item claim accepted as non-physical; no receipt, inspection disposition, or Return In movement created. '||btrim(p_note),auth.uid(),role_key);
 return resolution_id;
end$$;

create or replace function public.admin_record_exceptional_correction(p_correction_key uuid,p_target_kind text,p_target_id uuid,p_corrected_value jsonb,p_reason text)
returns uuid language plpgsql security definer set search_path=''as $$
declare previous jsonb;correction_id uuid;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Exceptional correction requires Admin or Super Admin.';end if;
 if p_correction_key is null then raise exception'Correction idempotency key is required.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception'Correction reason is required.';end if;
 if p_corrected_value is null or p_corrected_value='null'::jsonb then raise exception'Corrected state or value is required.';end if;
 previous:=case p_target_kind
  when'return-request'then(select to_jsonb(x)from reverse_logistics.return_requests x where x.id=p_target_id)
  when'return-receipt'then(select to_jsonb(x)from reverse_logistics.return_receipts x where x.id=p_target_id)
  when'inspection-disposition'then(select to_jsonb(x)from reverse_logistics.inspection_dispositions x where x.id=p_target_id)
  when'refund'then(select to_jsonb(x)from payments.return_refunds x where x.id=p_target_id)
  when'inventory-movement'then(select to_jsonb(x)from inventory.movements x where x.id=p_target_id)
  when'sale'then(select to_jsonb(x)from sales.completed_sales x where x.id=p_target_id)
  else null end;
 if previous is null then raise exception'Affected record could not be verified.';end if;
 insert into reverse_logistics.exceptional_corrections(correction_key,target_kind,target_id,previous_value,corrected_value,reason,actor_id,actor_role_key)
 values(p_correction_key,p_target_kind,p_target_id,previous,p_corrected_value,btrim(p_reason),auth.uid(),role_key)returning id into correction_id;
 return correction_id;
exception when unique_violation then raise exception'Duplicate correction was prevented.';end$$;

create or replace function public.admin_prepare_return_refund(p_request_id uuid,p_refund_delivery boolean default false,p_delivery_reason text default null)
returns uuid language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;rl reverse_logistics.return_lines%rowtype;ol sales.order_lines%rowtype;o sales.orders%rowtype;
 eligible_quantity numeric;product_amount numeric(18,2);delivery_amount numeric(18,2):=0;collected numeric(18,2);prior numeric(18,2);method text;refund_id uuid;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Refund approval requires Admin or Super Admin.';end if;
 select *into rr from reverse_logistics.return_requests where id=p_request_id for update;if rr.id is null or rr.current_state_key<>'inspected'then raise exception'Return or claim must be resolved before refund preparation.';end if;
 select *into rl from reverse_logistics.return_lines where return_request_id=rr.id;select *into ol from sales.order_lines where id=rl.order_line_id;select *into o from sales.orders where id=rr.order_id for update;
 if rr.reason_key='missing-item'then select quantity into eligible_quantity from reverse_logistics.non_physical_claim_resolutions where return_request_id=rr.id;
 else select coalesce(sum(quantity),0)into eligible_quantity from reverse_logistics.inspection_dispositions where return_line_id=rl.id;end if;
 if coalesce(eligible_quantity,0)<=0 then raise exception'No resolved quantity is eligible for refund.';end if;
 product_amount:=greatest(coalesce(round((o.subtotal_amount*(ol.quantity*ol.unit_price_amount/nullif(o.gross_product_amount,0)))*(eligible_quantity/ol.quantity),2),0),0);
 if p_refund_delivery then if rr.reason_key not in('wrong-product','damaged','defective','missing-item')then raise exception'Delivery charge refund requires a genuine REYON-fault reason.';end if;if nullif(btrim(p_delivery_reason),'')is null then raise exception'Delivery charge refund reason is required.';end if;delivery_amount:=o.delivery_amount;end if;
 select method_key_snapshot into method from sales.order_payment_details where order_id=o.id;select coalesce(sum(amount),0)into collected from payments.receipts where order_id=o.id;
 select coalesce(sum(r.total_refund_amount),0)into prior from payments.return_refunds r join reverse_logistics.return_requests prior_rr on prior_rr.id=r.return_request_id where prior_rr.order_id=o.id and r.status_key in('pending','refunded');
 if product_amount+delivery_amount<=0 then raise exception'Refund amount must be positive.';end if;if product_amount+delivery_amount+prior>collected then raise exception'Refund cannot exceed actual collected payment after prior refunds.';end if;
 insert into payments.return_refunds(return_request_id,product_refund_amount,delivery_refund_amount,currency_code,method_key,delivery_refund_reason,prepared_by)values(rr.id,product_amount,delivery_amount,o.currency_code,method,case when delivery_amount>0 then btrim(p_delivery_reason)else null end,auth.uid())returning id into refund_id;
 insert into payments.return_refund_events(refund_id,new_status,actor_id,actor_role_key,reason_note)values(refund_id,'pending',auth.uid(),role_key,'Proportional refund prepared from immutable order commercial snapshot.');perform reverse_logistics.append_return_event(rr.id,'refund-pending','Manual refund prepared; execution evidence required.',auth.uid(),role_key);return refund_id;
end$$;

revoke all on function public.admin_accept_missing_item_claim(uuid,text),public.admin_record_exceptional_correction(uuid,text,uuid,jsonb,text)from public,anon;
grant execute on function public.admin_accept_missing_item_claim(uuid,text),public.admin_record_exceptional_correction(uuid,text,uuid,jsonb,text)to authenticated;
