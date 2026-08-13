-- Sprint 19: governed review, approval, rejection, and pre-return operations.

create or replace function reverse_logistics.append_return_event(
  p_request_id uuid,p_target_state text,p_note text,p_actor_id uuid,p_actor_role text
)returns void language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;seq integer;begin
 select * into rr from reverse_logistics.return_requests where id=p_request_id for update;
 if rr.id is null then raise exception'Return request not found.';end if;
 select coalesce(max(sequence_number),0)+1 into seq from reverse_logistics.return_events where return_request_id=rr.id;
 update reverse_logistics.return_requests set current_state_key=p_target_state where id=rr.id;
 insert into reverse_logistics.return_events(return_request_id,sequence_number,from_state_key,to_state_key,actor_id,actor_role_key,reason_note)
 values(rr.id,seq,rr.current_state_key,p_target_state,p_actor_id,p_actor_role,btrim(p_note));
 insert into notifications.outbox(event_key,audience_key,order_id,payload)values
 ('return-'||p_target_state,'customer',rr.order_id,jsonb_build_object('returnRequestId',rr.id)),
 ('return-'||p_target_state,'admin',rr.order_id,jsonb_build_object('returnRequestId',rr.id));
end$$;

create or replace function public.admin_transition_return(p_request_id uuid,p_target_state text,p_note text)
returns void language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;role_key text;allowed boolean:=false;begin
 role_key:=public.reyon_admin_role();if role_key is null then raise exception'Administrator access required.';end if;
 if nullif(btrim(p_note),'')is null then raise exception'An internal reason or operational note is required.';end if;
 select * into rr from reverse_logistics.return_requests where id=p_request_id for update;
 if rr.id is null then raise exception'Return request not found.';end if;
 allowed:=case
  when rr.current_state_key='requested'and p_target_state='under-review'then true
  when rr.current_state_key='under-review'and p_target_state in('approved','rejected')and role_key in('admin','super-admin')then true
  when rr.current_state_key='approved'and p_target_state='awaiting-return'then true
  else false end;
 if not allowed then
  if rr.current_state_key='under-review'and p_target_state in('approved','rejected')then raise exception'Admin or Super Admin approval authority required.';end if;
  raise exception'This return transition is not allowed from the current state.';
 end if;
 perform reverse_logistics.append_return_event(rr.id,p_target_state,p_note,auth.uid(),role_key);
end$$;

create or replace function public.customer_withdraw_return(p_request_id uuid,p_order_reference text,p_phone text,p_reason text)
returns void language plpgsql security definer set search_path=''as $$
declare rr reverse_logistics.return_requests%rowtype;begin
 if nullif(btrim(p_reason),'')is null then raise exception'Withdrawal reason is required.';end if;
 select requests.*into rr from reverse_logistics.return_requests requests join sales.orders o on o.id=requests.order_id join sales.order_addresses a on a.order_id=o.id
 where requests.id=p_request_id and o.external_reference=upper(btrim(p_order_reference))and regexp_replace(a.phone,'[^0-9]+','','g')=regexp_replace(p_phone,'[^0-9]+','','g')for update of requests;
 if rr.id is null then raise exception'Return request could not be verified.';end if;
 if rr.current_state_key<>'requested'then raise exception'Only a newly requested return can be withdrawn online.';end if;
 perform reverse_logistics.append_return_event(rr.id,'withdrawn',p_reason,null,'customer');
end$$;

revoke all on function reverse_logistics.append_return_event(uuid,text,text,uuid,text)from public,anon,authenticated;
revoke all on function public.admin_transition_return(uuid,text,text)from public,anon;
grant execute on function public.admin_transition_return(uuid,text,text)to authenticated;
revoke all on function public.customer_withdraw_return(uuid,text,text,text)from public;
grant execute on function public.customer_withdraw_return(uuid,text,text,text)to anon,authenticated;
