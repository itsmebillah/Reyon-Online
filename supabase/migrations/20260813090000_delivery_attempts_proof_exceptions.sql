-- REYON Business OS: delivery attempts, proof, exceptions, and COD reconciliation.

create table fulfillment.delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  attempt_number integer not null,
  result_key text not null check (result_key in ('successful','failed')),
  reason text not null,
  note text not null,
  attempted_at timestamptz not null,
  actor_id uuid not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint delivery_attempt_number_valid check (attempt_number between 1 and 3),
  constraint delivery_attempt_reason_present check (btrim(reason) <> ''),
  constraint delivery_attempt_note_present check (btrim(note) <> ''),
  constraint delivery_attempt_number_unique unique (fulfillment_id, attempt_number)
);

create table fulfillment.proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null unique references fulfillment.fulfillments(id) on delete restrict,
  delivered_at timestamptz not null,
  receiver_name text not null,
  responsible_identity text not null,
  confirmation_note text not null,
  signature_asset_reference text,
  photo_asset_reference text,
  recorded_by uuid not null,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint pod_receiver_present check (btrim(receiver_name) <> ''),
  constraint pod_responsible_present check (btrim(responsible_identity) <> ''),
  constraint pod_confirmation_present check (btrim(confirmation_note) <> '')
);

create table fulfillment.delivery_exceptions (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  exception_state_key text not null check (exception_state_key in ('delivery-failed','delivery-cancelled','lost','damaged')),
  reason text not null,
  note text not null,
  occurred_at timestamptz not null default statement_timestamp(),
  actor_id uuid not null,
  actor_role_key text not null,
  constraint delivery_exception_reason_present check (btrim(reason) <> ''),
  constraint delivery_exception_note_present check (btrim(note) <> '')
);

create table payments.cod_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references sales.orders(id) on delete restrict,
  fulfillment_id uuid not null references fulfillment.fulfillments(id) on delete restrict,
  expected_amount numeric(18,2) not null,
  collected_amount numeric(18,2) not null,
  outcome_key text not null check (outcome_key in ('matched','mismatch')),
  reason text,
  occurred_at timestamptz not null default statement_timestamp(),
  actor_id uuid not null,
  actor_role_key text not null,
  constraint cod_reconciliation_amounts_valid check (expected_amount >= 0 and collected_amount >= 0),
  constraint cod_mismatch_reason_required check (outcome_key <> 'mismatch' or (reason is not null and btrim(reason) <> ''))
);

create index delivery_attempts_fulfillment_idx on fulfillment.delivery_attempts(fulfillment_id,attempt_number);
create index delivery_exceptions_fulfillment_idx on fulfillment.delivery_exceptions(fulfillment_id,occurred_at);
create index cod_reconciliation_order_idx on payments.cod_reconciliation_events(order_id,occurred_at);
create trigger delivery_attempts_prevent_mutation before update or delete on fulfillment.delivery_attempts for each row execute function fulfillment.prevent_evidence_mutation();
create trigger pod_prevent_mutation before update or delete on fulfillment.proof_of_delivery for each row execute function fulfillment.prevent_evidence_mutation();
create trigger delivery_exceptions_prevent_mutation before update or delete on fulfillment.delivery_exceptions for each row execute function fulfillment.prevent_evidence_mutation();
create trigger cod_reconciliation_prevent_mutation before update or delete on payments.cod_reconciliation_events for each row execute function payments.prevent_evidence_mutation();
alter table fulfillment.delivery_attempts enable row level security;
alter table fulfillment.proof_of_delivery enable row level security;
alter table fulfillment.delivery_exceptions enable row level security;
alter table payments.cod_reconciliation_events enable row level security;
revoke all on fulfillment.delivery_attempts,fulfillment.proof_of_delivery,fulfillment.delivery_exceptions,payments.cod_reconciliation_events from public,anon,authenticated;
grant all on fulfillment.delivery_attempts,fulfillment.proof_of_delivery,fulfillment.delivery_exceptions,payments.cod_reconciliation_events to service_role;

create or replace function fulfillment.append_transition(p_fulfillment_id uuid,p_target text,p_note text,p_actor uuid)
returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;seq integer;t_id uuid;begin
 select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
 select coalesce(max(sequence_number),0)+1 into seq from fulfillment.fulfillment_transitions where fulfillment_id=f.id;
 update fulfillment.fulfillments set current_state_key=p_target where id=f.id;
 insert into fulfillment.fulfillment_transitions(fulfillment_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,rule_version,idempotency_key)
 values(f.id,seq,f.current_state_key,p_target,statement_timestamp(),p_actor,'sprint-18-v1','delivery-transition:'||f.id::text||':'||seq::text)returning id into t_id;
 if nullif(btrim(p_note),'')is not null then insert into fulfillment.delivery_transition_notes(transition_id,note)values(t_id,btrim(p_note));end if;
end$$;

create or replace function public.admin_record_delivery_attempt(p_fulfillment_id uuid,p_result text,p_reason text,p_note text)
returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;attempt_no integer;begin
 if public.reyon_admin_role() is null then raise exception 'Administrator access required.';end if;
 if p_result not in('successful','failed')then raise exception 'Select a valid attempt result.';end if;
 if nullif(btrim(p_reason),'')is null or nullif(btrim(p_note),'')is null then raise exception 'Attempt reason and note are required.';end if;
 select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
 if f.current_state_key<>'out-for-delivery'then raise exception 'Attempts can be recorded only while Out for Delivery.';end if;
 select count(*)+1 into attempt_no from fulfillment.delivery_attempts where fulfillment_id=f.id;
 if attempt_no>3 then raise exception 'The maximum of three delivery attempts has been reached.';end if;
 insert into fulfillment.delivery_attempts(fulfillment_id,attempt_number,result_key,reason,note,attempted_at,actor_id)
 values(f.id,attempt_no,p_result,btrim(p_reason),btrim(p_note),statement_timestamp(),auth.uid());
 if p_result='failed' and attempt_no=3 then
  insert into fulfillment.delivery_exceptions(fulfillment_id,exception_state_key,reason,note,actor_id,actor_role_key)
  values(f.id,'delivery-failed','Maximum attempts reached',btrim(p_note),auth.uid(),public.reyon_admin_role());
  perform fulfillment.append_transition(f.id,'delivery-failed','Third failed delivery attempt; review/return handling required.',auth.uid());
 end if;
end$$;

create or replace function public.admin_complete_delivery(p_fulfillment_id uuid,p_receiver_name text,p_responsible_identity text,p_confirmation_note text,p_collected_amount numeric default null,p_cod_mismatch_reason text default null)
returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;o sales.orders%rowtype;payment sales.order_payment_details%rowtype;role_key text;outcome text;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception 'Administrator access required.';end if;
 if nullif(btrim(p_receiver_name),'')is null or nullif(btrim(p_responsible_identity),'')is null or nullif(btrim(p_confirmation_note),'')is null then raise exception 'Receiver, responsible identity, and confirmation are required.';end if;
 select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
 if f.current_state_key<>'out-for-delivery'then raise exception 'Shipment must be Out for Delivery.';end if;
 select * into o from sales.orders where id=f.order_id for update;select * into payment from sales.order_payment_details where order_id=o.id;
 insert into fulfillment.proof_of_delivery(fulfillment_id,delivered_at,receiver_name,responsible_identity,confirmation_note,recorded_by)
 values(f.id,statement_timestamp(),btrim(p_receiver_name),btrim(p_responsible_identity),btrim(p_confirmation_note),auth.uid());
 perform fulfillment.append_transition(f.id,'delivered','Receiver: '||btrim(p_receiver_name)||'; responsible: '||btrim(p_responsible_identity),auth.uid());
 if payment.method_kind_snapshot='cod' then
  if p_collected_amount is null then raise exception 'Collected COD amount is required.';end if;
  outcome:=case when p_collected_amount=o.total_amount then'matched'else'mismatch'end;
  if outcome='mismatch'and nullif(btrim(p_cod_mismatch_reason),'')is null then raise exception 'COD mismatch reason is required.';end if;
  insert into payments.cod_reconciliation_events(order_id,fulfillment_id,expected_amount,collected_amount,outcome_key,reason,actor_id,actor_role_key)
  values(o.id,f.id,o.total_amount,p_collected_amount,outcome,case when outcome='mismatch'then btrim(p_cod_mismatch_reason)else null end,auth.uid(),role_key);
  if outcome='mismatch'then
   insert into sales.order_review_cases(order_id,review_type_key,internal_note)values(o.id,'payment-mismatch','COD collected amount did not match expected Grand Total.')on conflict do nothing;
   return;
  end if;
 end if;
 perform public.admin_transition_order(o.id,'delivered',null,null);
end$$;

create or replace function public.admin_record_delivery_exception(p_fulfillment_id uuid,p_exception_state text,p_reason text,p_note text)
returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('super-admin','admin')then raise exception 'Admin exception-control permission required.';end if;
 if p_exception_state not in('delivery-cancelled','lost','damaged')then raise exception 'Select an approved delivery exception.';end if;
 if nullif(btrim(p_reason),'')is null or nullif(btrim(p_note),'')is null then raise exception 'Exception reason and note are required.';end if;
 select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;
 if p_exception_state='delivery-cancelled'and f.current_state_key not in('ready-for-dispatch','courier-assigned')then raise exception 'After pickup use the approved return/exception workflow.';end if;
 if p_exception_state in('lost','damaged')and f.current_state_key not in('picked-up','in-transit','out-for-delivery')then raise exception 'Lost or Damaged requires a picked-up shipment.';end if;
 insert into fulfillment.delivery_exceptions(fulfillment_id,exception_state_key,reason,note,actor_id,actor_role_key)
 values(f.id,p_exception_state,btrim(p_reason),btrim(p_note),auth.uid(),role_key);
 perform fulfillment.append_transition(f.id,p_exception_state,btrim(p_reason)||': '||btrim(p_note),auth.uid());
end$$;

create or replace function public.admin_reconcile_cod(p_fulfillment_id uuid,p_collected_amount numeric,p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare f fulfillment.fulfillments%rowtype;o sales.orders%rowtype;role_key text;begin
 role_key:=public.reyon_admin_role();if role_key not in('super-admin','admin')then raise exception 'Sensitive COD correction requires Admin permission.';end if;
 if nullif(btrim(p_reason),'')is null then raise exception 'COD correction reason is required.';end if;
 select * into f from fulfillment.fulfillments where id=p_fulfillment_id for update;if f.current_state_key<>'delivered'then raise exception 'Delivered shipment required.';end if;
 select * into o from sales.orders where id=f.order_id for update;
 if not exists(select 1 from payments.cod_reconciliation_events where order_id=o.id and outcome_key='mismatch')then raise exception 'No COD mismatch requires correction.';end if;
 insert into payments.cod_reconciliation_events(order_id,fulfillment_id,expected_amount,collected_amount,outcome_key,reason,actor_id,actor_role_key)
 values(o.id,f.id,o.total_amount,p_collected_amount,case when p_collected_amount=o.total_amount then'matched'else'mismatch'end,btrim(p_reason),auth.uid(),role_key);
 if p_collected_amount=o.total_amount and o.current_state_key='shipped'then perform public.admin_transition_order(o.id,'delivered',null,null);end if;
end$$;

create or replace function notifications.enqueue_delivery_attempt()returns trigger language plpgsql security definer set search_path=''as $$declare oid uuid;begin select order_id into oid from fulfillment.fulfillments where id=new.fulfillment_id;insert into notifications.outbox(event_key,audience_key,order_id,payload)values('delivery-attempt-'||new.result_key,'customer',oid,jsonb_build_object('attempt',new.attempt_number)),('delivery-attempt-'||new.result_key,'admin',oid,jsonb_build_object('attempt',new.attempt_number));return new;end$$;
create trigger delivery_attempt_notification after insert on fulfillment.delivery_attempts for each row execute function notifications.enqueue_delivery_attempt();
create or replace function notifications.enqueue_cod_reconciliation()returns trigger language plpgsql security definer set search_path=''as $$begin insert into notifications.outbox(event_key,audience_key,order_id,payload)values('cod-reconciliation-'||new.outcome_key,'admin',new.order_id,jsonb_build_object('eventId',new.id));return new;end$$;
create trigger cod_reconciliation_notification after insert on payments.cod_reconciliation_events for each row execute function notifications.enqueue_cod_reconciliation();

revoke all on function public.admin_record_delivery_attempt(uuid,text,text,text),public.admin_complete_delivery(uuid,text,text,text,numeric,text),public.admin_record_delivery_exception(uuid,text,text,text),public.admin_reconcile_cod(uuid,numeric,text)from public,anon;
grant execute on function public.admin_record_delivery_attempt(uuid,text,text,text),public.admin_complete_delivery(uuid,text,text,text,numeric,text),public.admin_record_delivery_exception(uuid,text,text,text),public.admin_reconcile_cod(uuid,numeric,text)to authenticated;

create or replace function public.admin_delivery_operations() returns jsonb language sql stable security definer set search_path='' as $$
select case when public.is_reyon_admin() then jsonb_build_object(
 'partners',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'key',partner_key,'name',display_name,'isActive',is_active)order by display_name),'[]'::jsonb)from fulfillment.delivery_partners),
 'shipments',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',f.id,'orderId',o.id,'orderNumber',o.external_reference,'state',f.current_state_key,
  'partner',p.display_name,'handler',f.handler_name,'reference',r.external_reference,'createdAt',f.created_at,
  'attemptCount',(select count(*)from fulfillment.delivery_attempts a where a.fulfillment_id=f.id),
  'paymentKind',opd.method_kind_snapshot,'expectedAmount',o.total_amount,
  'codMismatch',exists(select 1 from payments.cod_reconciliation_events c where c.fulfillment_id=f.id and c.outcome_key='mismatch')
 )order by f.created_at desc),'[]'::jsonb)
 from fulfillment.fulfillments f join sales.orders o on o.id=f.order_id
 join sales.order_payment_details opd on opd.order_id=o.id
 left join fulfillment.delivery_partners p on p.id=f.partner_id
 left join lateral(select external_reference from fulfillment.delivery_references where fulfillment_id=f.id order by created_at desc limit 1)r on true)
)else null end$$;
