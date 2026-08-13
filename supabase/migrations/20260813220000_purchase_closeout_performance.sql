-- Sprint 20 final milestone: governed PO closeout and factual supplier insight.

create or replace function public.admin_close_purchase_order(p_order_id uuid,p_note text default null)
returns void language plpgsql security definer set search_path=''as $$
declare role_key text;po purchasing.purchase_orders%rowtype;
begin
 role_key:=public.reyon_admin_role();if role_key not in('admin','super-admin')then raise exception'Admin closeout authority required.';end if;
 select *into po from purchasing.purchase_orders where id=p_order_id for update;
 if po.id is null or po.status_key<>'fully-received'then raise exception'Only a Fully Received purchase order can be closed.';end if;
 update purchasing.purchase_orders set status_key='closed'where id=po.id;
 perform purchasing.record_po_transition(po.id,'fully-received','closed',nullif(btrim(p_note),''),role_key);
end$$;

create or replace function public.admin_supplier_performance_overview()returns jsonb language plpgsql stable security definer set search_path=''as $$
begin
 if public.reyon_admin_role()is null then raise exception'Administrator access required.';end if;
 return jsonb_build_object(
  'closeableOrders',coalesce((select jsonb_agg(jsonb_build_object('id',po.id,'reference',po.external_reference,
   'supplierName',s.display_name,'eligiblePayable',purchasing.purchase_order_eligible_payable(po.id),
   'paidAmount',purchasing.purchase_order_verified_paid(po.id))order by po.created_at desc)
   from purchasing.purchase_orders po join purchasing.suppliers s on s.id=po.supplier_id where po.status_key='fully-received'),'[]'::jsonb),
  'suppliers',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.display_name,'status',s.status_key,
   'poCount',(select count(*)from purchasing.purchase_orders po where po.supplier_id=s.id),
   'closedCount',(select count(*)from purchasing.purchase_orders po where po.supplier_id=s.id and po.status_key='closed'),
   'receiptCount',(select count(*)from purchasing.purchase_receipts r join purchasing.purchase_orders po on po.id=r.purchase_order_id where po.supplier_id=s.id),
   'discrepancyCount',(select count(*)from purchasing.purchase_receipts r join purchasing.purchase_orders po on po.id=r.purchase_order_id where po.supplier_id=s.id and(r.discrepancy_note is not null or r.excess_approved)),
   'returnCount',(select count(*)from purchasing.purchase_returns pr join purchasing.purchase_receipt_lines rl on rl.id=pr.purchase_receipt_line_id join purchasing.purchase_receipts r on r.id=rl.purchase_receipt_id join purchasing.purchase_orders po on po.id=r.purchase_order_id where po.supplier_id=s.id and pr.status_key not in('rejected','cancelled')),
   'verifiedPaid',coalesce((select sum(purchasing.purchase_order_verified_paid(po.id))from purchasing.purchase_orders po where po.supplier_id=s.id),0),
   'outstanding',coalesce((select sum(greatest(0,purchasing.purchase_order_eligible_payable(po.id)-purchasing.purchase_order_verified_paid(po.id)))from purchasing.purchase_orders po where po.supplier_id=s.id),0))order by s.display_name)
   from purchasing.suppliers s),'[]'::jsonb),
  'replenishment',coalesce((select jsonb_agg(jsonb_build_object('variantId',v.id,'productName',p.name,'variantLabel',v.label,'sku',v.sku,
   'onHand',coalesce((select sum(ml.quantity_delta)from inventory.stock_items si join inventory.movement_lines ml on ml.stock_item_id=si.id where si.catalog_variant_id=v.id),0),
   'supplierName',s.display_name,'moq',r.minimum_order_quantity,'packSize',r.pack_size,'purchaseCost',r.purchase_cost_amount,'leadTimeDays',r.lead_time_days)
   order by p.name,v.label)from purchasing.supplier_variant_relationships r join purchasing.suppliers s on s.id=r.supplier_id
   join catalog.variants v on v.id=r.catalog_variant_id join catalog.products p on p.id=v.product_id
   where r.is_active and r.is_preferred and s.status_key='active'),'[]'::jsonb));
end$$;

revoke all on function public.admin_close_purchase_order(uuid,text)from public,anon;
revoke all on function public.admin_supplier_performance_overview()from public,anon;
grant execute on function public.admin_close_purchase_order(uuid,text)to authenticated;
grant execute on function public.admin_supplier_performance_overview()to authenticated;
