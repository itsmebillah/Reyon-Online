-- Rollback-only production contract verification. No test partner survives this migration.
do $verification$
declare
  v_admin_id uuid;
  v_key constant text := 'codex-delivery-contract-verification';
begin
  select user_id into v_admin_id from access.admin_memberships
  where revoked_at is null and role_key in ('super-admin','admin') limit 1;
  if v_admin_id is null then raise exception 'Delivery partner verification requires an active Admin.';end if;
  perform set_config('request.jwt.claim.sub',v_admin_id::text,true);
  begin
    perform public.admin_configure_delivery_partner(v_key,'Contract verification',false);
    if not exists(select 1 from fulfillment.delivery_partners where partner_key=v_key and display_name='Contract verification'and not is_active)then
      raise exception 'Delivery partner create contract failed.';
    end if;
    perform public.admin_configure_delivery_partner(v_key,'Contract verification edited',true);
    if not exists(select 1 from fulfillment.delivery_partners where partner_key=v_key and display_name='Contract verification edited'and is_active)then
      raise exception 'Delivery partner edit/activation contract failed.';
    end if;
    if(select count(*)from fulfillment.delivery_partners where is_active)<>1 then
      raise exception 'Single active delivery partner rule failed.';
    end if;
    perform public.admin_configure_delivery_partner(v_key,'Contract verification edited again',true);
    if(select count(*)from fulfillment.delivery_partners where partner_key=v_key)<>1 then
      raise exception 'Delivery partner upsert created a duplicate.';
    end if;
    raise exception 'delivery-partner-verification-rollback';
  exception when raise_exception then
    if sqlerrm<>'delivery-partner-verification-rollback'then raise;end if;
  end;
  if exists(select 1 from fulfillment.delivery_partners where partner_key=v_key)then
    raise exception 'Delivery partner verification rollback failed.';
  end if;
end$verification$;
