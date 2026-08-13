-- A resolved COD mismatch must no longer remain actionable in the Admin read model.
create or replace function public.admin_delivery_operations() returns jsonb
language sql stable security definer set search_path='' as $$
select case when public.is_reyon_admin() then jsonb_build_object(
 'partners',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'key',partner_key,'name',display_name,'isActive',is_active)order by display_name),'[]'::jsonb)from fulfillment.delivery_partners),
 'shipments',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',f.id,'orderId',o.id,'orderNumber',o.external_reference,'state',f.current_state_key,
  'partner',p.display_name,'handler',f.handler_name,'reference',r.external_reference,'createdAt',f.created_at,
  'attemptCount',(select count(*)from fulfillment.delivery_attempts a where a.fulfillment_id=f.id),
  'paymentKind',opd.method_kind_snapshot,'expectedAmount',o.total_amount,
  'codMismatch',coalesce((select c.outcome_key='mismatch' from payments.cod_reconciliation_events c where c.fulfillment_id=f.id order by c.occurred_at desc limit 1),false)
 )order by f.created_at desc),'[]'::jsonb)
 from fulfillment.fulfillments f join sales.orders o on o.id=f.order_id
 join sales.order_payment_details opd on opd.order_id=o.id
 left join fulfillment.delivery_partners p on p.id=f.partner_id
 left join lateral(select external_reference from fulfillment.delivery_references where fulfillment_id=f.id order by created_at desc limit 1)r on true)
)else null end$$;
