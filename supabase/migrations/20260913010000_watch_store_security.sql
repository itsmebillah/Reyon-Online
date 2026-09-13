-- Reject missing memberships at every privileged role comparison. Preserve
-- existing identities, orders and ledger evidence; no historical data is removed.
do $hardening$
declare f record; definition text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','accounting') and p.prokind='f'
  loop
    definition := pg_get_functiondef(f.oid);
    if definition ~* 'public.reyon_admin_role\(\)\s*(not in|<>)' then
      definition := regexp_replace(definition, 'public.reyon_admin_role\(\)(\s*(?:not in|<>))', 'coalesce(public.reyon_admin_role(), '''')\1', 'gi');
      execute definition;
    end if;
    definition := regexp_replace(definition, '(if\s+|or\s+)(role_key|member_role|v_role)(\s+not in)', '\1coalesce(\2, '''')\3', 'gi');
    if definition <> pg_get_functiondef(f.oid) then execute definition;end if;
  end loop;
end $hardening$;

create or replace function accounting.can_configure()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.reyon_admin_role()='super-admin',false) or exists (
    select 1 from accounting.finance_approvers fa
    join access.admin_memberships m on m.user_id=fa.user_id and m.revoked_at is null and m.role_key in ('super-admin','admin')
    join organization.organizations o on o.id=fa.organization_id and o.code='reyon-online'
    where fa.user_id=auth.uid() and fa.revoked_at is null
  );
$$;
revoke all on function accounting.can_configure() from public,anon,authenticated;

-- Customer aftercare is bound to the private order token, never only a phone.
create or replace function commerce.require_order_access(p_access_token uuid,p_order_reference text)
returns void language plpgsql stable security definer set search_path='' as $$
begin
  if not exists (
    select 1 from commerce.carts c join commerce.cart_orders co on co.cart_id=c.id
    join sales.orders o on o.id=co.order_id
    where c.access_token=p_access_token and c.expires_at>statement_timestamp()
      and o.external_reference=upper(btrim(p_order_reference))
  ) then raise exception 'Open this order from the browser used at checkout, or contact support.'; end if;
end $$;
revoke all on function commerce.require_order_access(uuid,text) from public,anon,authenticated;

-- Move legacy implementations to a private schema and expose token-checked
-- wrappers with the same name plus a required UUID. No old public overload remains.
do $aftercare$
declare f record; args text; call_args text; result_type text; wrapper text;
begin
  for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'customer_return_eligible_lines','customer_request_return','customer_delivery_status',
      'customer_sales_documents','request_order_cancellation','resubmit_manual_payment_evidence','request_order_change')
  loop
    args := pg_get_function_arguments(f.oid);
    result_type := pg_get_function_result(f.oid);
    select string_agg(quote_ident(x),',') into call_args from unnest((select proargnames from pg_proc where oid=f.oid)) x;
    execute format('alter function %s set schema commerce',f.oid::regprocedure);
    execute format('revoke all on function %s from public,anon,authenticated',f.oid::regprocedure);
    wrapper := format('create function public.%I(p_access_token uuid,%s) returns %s language plpgsql security definer set search_path='''' as $body$ begin perform commerce.require_order_access(p_access_token,p_order_reference); %s commerce.%I(%s); end $body$',
      f.proname,args,result_type,case when result_type='void' then 'perform' else 'return' end,f.proname,call_args);
    execute wrapper;
  end loop;
end $aftercare$;
do $grants$
declare f record;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('customer_return_eligible_lines','customer_request_return','customer_delivery_status','customer_sales_documents','request_order_cancellation','resubmit_manual_payment_evidence','request_order_change') loop
 execute format('revoke all on function %s from public',f.oid::regprocedure);
 execute format('grant execute on function %s to anon,authenticated',f.oid::regprocedure);
 end loop;
end $grants$;
