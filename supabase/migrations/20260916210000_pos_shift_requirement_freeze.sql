-- Temporarily freeze register-shift enforcement without removing its schema or functions.
-- Checkout remains canonical, transactional, capability-gated, and register/location scoped.

alter table pos.sale_details alter column shift_id drop not null;

create or replace function public.pos_checkout(p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_idempotency text:=nullif(btrim(p_request->>'idempotencyKey'),'');
  v_location uuid:=(p_request->>'locationId')::uuid;
  v_register uuid:=(p_request->>'registerId')::uuid;
  v_shift uuid:=null;
  v_org uuid; v_channel uuid; v_order uuid; v_existing uuid; v_transition uuid; v_movement uuid;
  v_customer uuid; v_payment_method uuid; v_payment uuid; v_invoice bigint; v_receipt bigint;
  v_gross numeric(18,2):=0; v_discount numeric(18,2):=0; v_tax numeric(18,2):=0; v_total numeric(18,2):=0;
  v_tendered numeric(18,2):=0; v_applied numeric(18,2):=0; v_remaining numeric(18,2):=0;
  v_discount_value numeric:=coalesce((p_request->>'discountValue')::numeric,0);
  v_tax_rate numeric:=coalesce((p_request->>'taxRate')::numeric,0);
  v_line integer:=0; v_tender_line integer:=0; item record; tender record; v_name text; v_phone text;
  v_status text; v_summary_method text; v_summary_kind text; v_summary_state text;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if v_idempotency is null then raise exception 'Idempotency key is required.'; end if;
  select order_id into v_existing from pos.sale_details where idempotency_key=v_idempotency;
  if v_existing is not null then return public.pos_receipt(v_existing); end if;
  if not access.has_capability('pos.checkout',v_location) then raise exception 'POS checkout permission required.'; end if;
  if jsonb_typeof(p_request->'items')<>'array' or jsonb_array_length(p_request->'items')=0 then raise exception 'Cart is empty.'; end if;
  if jsonb_typeof(p_request->'tenders')<>'array' then raise exception 'Tender lines are required.'; end if;
  select o.id,c.id into v_org,v_channel from organization.organizations o join organization.channels c on c.organization_id=o.id and c.code='physical-pos' where o.code='reyon-online';
  if not exists(select 1 from pos.registers r where r.id=v_register and r.location_id=v_location and r.organization_id=v_org and r.is_active) then raise exception 'Register does not belong to the selected location.'; end if;

  for item in
    select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid order by (x->>'variantId')::uuid
  loop
    if item.quantity<=0 or item.quantity<>trunc(item.quantity) then raise exception 'Sale quantity must be a positive whole number.'; end if;
    perform 1 from inventory.stock_items si where si.catalog_variant_id=item.variant_id for update;
    select item.variant_id variant_id,item.quantity quantity,p.name,v.label,v.sku,si.id stock_item_id,si.base_unit_code,
      coalesce(po.price_amount,wo.price_amount) price_amount,coalesce(sp.available,0) available
    into item from catalog.variants v join catalog.products p on p.id=v.product_id and p.status='published'
      join inventory.stock_items si on si.catalog_variant_id=v.id
      left join catalog.offers po on po.variant_id=v.id and po.channel_key='physical-pos' and po.currency_code='BDT'
      left join catalog.offers wo on wo.variant_id=v.id and wo.channel_key='website' and wo.currency_code='BDT'
      left join inventory.stock_position sp on sp.stock_item_id=si.id and sp.location_id=v_location
      where v.id=item.variant_id;
    if item.stock_item_id is null or item.price_amount is null then raise exception 'A cart product is not currently saleable.'; end if;
    if item.available<item.quantity then raise exception 'Insufficient stock for %. Requested %; available %.',item.name,item.quantity,greatest(floor(item.available),0); end if;
    v_gross:=v_gross+round(item.price_amount*item.quantity,2);
  end loop;
  v_discount:=case when upper(coalesce(p_request->>'discountType','FIXED'))='PERCENT' then round(v_gross*least(greatest(v_discount_value,0),100)/100,2) else least(greatest(round(v_discount_value,2),0),v_gross) end;
  v_tax:=round((v_gross-v_discount)*greatest(v_tax_rate,0)/100,2);
  v_total:=round(v_gross-v_discount+v_tax,2);
  select coalesce(sum((x->>'amount')::numeric),0) into v_tendered from jsonb_array_elements(p_request->'tenders') x where coalesce((x->>'amount')::numeric,0)>0;
  v_tendered:=round(v_tendered,2); v_remaining:=greatest(v_total-v_tendered,0);
  if v_remaining>0 and not access.has_capability('pos.record_due',v_location) then raise exception 'Full payment is required.'; end if;
  v_status:=case when v_remaining=0 then 'paid' when v_tendered>0 then 'partial' else 'due' end;

  v_name:=nullif(btrim(p_request->>'customerName'),''); v_phone:=nullif(btrim(p_request->>'customerPhone'),'');
  if v_phone is not null then
    select cc.customer_id into v_customer from crm.customer_contacts cc join crm.customers c on c.id=cc.customer_id
      where c.organization_id=v_org and cc.contact_kind='phone' and cc.normalized_value=regexp_replace(v_phone,'[^0-9]+','','g') limit 1;
    if v_customer is null then
      insert into crm.customers(organization_id) values(v_org) returning id into v_customer;
      insert into crm.customer_profiles(customer_id,full_name) values(v_customer,coalesce(v_name,'POS Customer'));
      insert into crm.customer_contacts(customer_id,contact_kind,contact_value,normalized_value) values(v_customer,'phone',v_phone,regexp_replace(v_phone,'[^0-9]+','','g'));
      insert into crm.external_identities(organization_id,customer_id,source_namespace,source_reference,idempotency_key)
      values(v_org,v_customer,'physical-pos',v_idempotency,'pos-customer:'||v_idempotency);
      insert into crm.customer_events(organization_id,customer_id,sequence_number,event_type_key,occurred_at,reason,rule_version,idempotency_key)
      values(v_org,v_customer,1,'profile-created',statement_timestamp(),'Created during authorized POS sale','pos-v1','pos-customer-profile:'||v_idempotency);
    end if;
  end if;

  v_order:=gen_random_uuid();
  insert into sales.orders(id,organization_id,channel_id,currency_code,source_namespace,source_reference,idempotency_key,occurred_at,customer_id,current_state_key,subtotal_amount,delivery_amount,total_amount,gross_product_amount,discount_amount)
  values(v_order,v_org,v_channel,'BDT','physical-pos',v_idempotency,'pos-order:'||v_idempotency,statement_timestamp(),v_customer,'completed',v_total,0,v_total,v_gross+v_tax,v_discount);

  for item in
    select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity
    from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid order by (x->>'variantId')::uuid
  loop
    select item.variant_id variant_id,item.quantity quantity,p.name,v.label,v.sku,si.id stock_item_id,si.base_unit_code,coalesce(po.price_amount,wo.price_amount) price_amount
    into item from catalog.variants v join catalog.products p on p.id=v.product_id join inventory.stock_items si on si.catalog_variant_id=v.id
      left join catalog.offers po on po.variant_id=v.id and po.channel_key='physical-pos' and po.currency_code='BDT'
      left join catalog.offers wo on wo.variant_id=v.id and wo.channel_key='website' and wo.currency_code='BDT' where v.id=item.variant_id;
    v_line:=v_line+1;
    insert into sales.order_lines(order_id,line_number,catalog_variant_id,sku_snapshot,product_name_snapshot,variant_label_snapshot,quantity,unit_price_amount)
    values(v_order,v_line,item.variant_id,item.sku,item.name,item.label,item.quantity,item.price_amount);
  end loop;
  insert into inventory.movements(movement_type_key,occurred_at,source_namespace,source_reference,idempotency_key,reason_key,actor_id,actor_label)
  values('sale',statement_timestamp(),'sales-order',(select external_reference from sales.orders where id=v_order),'pos-stock:'||v_idempotency,'pos-checkout',auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text)) returning id into v_movement;
  insert into inventory.movement_lines(movement_id,line_number,stock_item_id,location_id,quantity_delta,unit_code,condition_key)
  select v_movement,row_number()over(order by si.id),si.id,v_location,-q.quantity,si.base_unit_code,'sold'
  from (select (x->>'variantId')::uuid variant_id,sum((x->>'quantity')::numeric) quantity from jsonb_array_elements(p_request->'items') x group by (x->>'variantId')::uuid)q
  join inventory.stock_items si on si.catalog_variant_id=q.variant_id;

  select id into v_payment_method from payments.checkout_methods where method_key='cod';
  v_summary_method:=case when jsonb_array_length(p_request->'tenders')>1 then 'Split payment' else initcap(replace(coalesce(p_request->'tenders'->0->>'method','cash'),'-',' ')) end;
  v_summary_kind:=case when v_status='paid' then 'cod' else 'cod' end;
  v_summary_state:='collected';
  insert into sales.order_payment_details(order_id,method_id,method_key_snapshot,method_name_snapshot,method_kind_snapshot,transaction_reference,evidence_state_key)
  values(v_order,v_payment_method,'pos-tender',v_summary_method,v_summary_kind,null,v_summary_state);

  v_remaining:=v_total;
  for tender in select x,row_number()over() line_no from jsonb_array_elements(p_request->'tenders')x where coalesce((x->>'amount')::numeric,0)>0
  loop
    v_tender_line:=v_tender_line+1; v_applied:=least(round((tender.x->>'amount')::numeric,2),v_remaining);
    if tender.x->>'method' not in ('cash','card','mobile','bank-transfer') then raise exception 'Unsupported tender method.'; end if;
    if tender.x->>'method'<>'cash' and nullif(btrim(tender.x->>'reference'),'') is null then raise exception 'A transaction reference is required for non-cash tenders.'; end if;
    if v_applied>0 then
      insert into payments.payment_records(organization_id,payment_kind_key,currency_code,amount,source_namespace,source_reference,idempotency_key,occurred_at,actor_id)
      values(v_org,tender.x->>'method','BDT',v_applied,'physical-pos',(select external_reference from sales.orders where id=v_order),'pos-payment:'||v_idempotency||':'||v_tender_line,statement_timestamp(),auth.uid()) returning id into v_payment;
      insert into payments.order_allocations(payment_id,order_id,amount,allocation_kind_key,occurred_at,idempotency_key)
      values(v_payment,v_order,v_applied,'sale',statement_timestamp(),'pos-allocation:'||v_idempotency||':'||v_tender_line);
      insert into payments.payment_events(payment_id,sequence_number,event_type_key,to_state_key,provider_namespace,provider_event_reference,occurred_at,actor_id,rule_version,idempotency_key)
      values(v_payment,1,'collected','collected',case when tender.x->>'method'='cash' then null else tender.x->>'method' end,
        case when tender.x->>'method'='cash' then null else btrim(tender.x->>'reference') end,statement_timestamp(),auth.uid(),'pos-v1','pos-payment-event:'||v_idempotency||':'||v_tender_line);
      insert into payments.receipts(order_id,source_event_type,source_event_id,payment_method_snapshot,amount,currency_code,issued_at)
      values(v_order,'pos-payment',v_payment,initcap(replace(tender.x->>'method','-',' ')),v_applied,'BDT',statement_timestamp());
    end if;
    insert into pos.tenders(order_id,payment_id,line_number,method_key,method_name_snapshot,tendered_amount,applied_amount,transaction_reference)
    values(v_order,v_payment,v_tender_line,tender.x->>'method',initcap(replace(tender.x->>'method','-',' ')),round((tender.x->>'amount')::numeric,2),v_applied,nullif(btrim(tender.x->>'reference'),''));
    v_remaining:=greatest(v_remaining-v_applied,0);
  end loop;
  insert into pos.sale_details(order_id,register_id,shift_id,location_id,operator_id,operator_label,customer_name_snapshot,customer_phone_snapshot,notes,tax_rate,tax_amount,tendered_amount,change_amount,due_amount,payment_status_key,idempotency_key)
  values(v_order,v_register,v_shift,v_location,auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text),v_name,v_phone,nullif(btrim(p_request->>'notes'),''),v_tax_rate,v_tax,v_tendered,greatest(v_tendered-v_total,0),greatest(v_total-v_tendered,0),v_status,v_idempotency);
  if v_customer is not null then insert into crm.order_associations(organization_id,customer_id,order_id,association_kind_key,occurred_at,actor_id,idempotency_key)
    values(v_org,v_customer,v_order,'customer',statement_timestamp(),auth.uid(),'pos-order-customer:'||v_idempotency); end if;
  insert into sales.order_transitions(id,order_id,sequence_number,from_state_key,to_state_key,occurred_at,actor_id,reason_key,rule_version,idempotency_key)
  values(gen_random_uuid(),v_order,1,null,'completed',statement_timestamp(),auth.uid(),'pos-checkout','pos-v1','pos-complete:'||v_idempotency) returning id into v_transition;
  return public.pos_receipt(v_order);
exception when unique_violation then
  select order_id into v_existing from pos.sale_details where idempotency_key=v_idempotency;
  if v_existing is null then raise; end if;
  return public.pos_receipt(v_existing);
end;
$$;

revoke all on function public.pos_checkout(jsonb) from public, anon;
grant execute on function public.pos_checkout(jsonb) to authenticated;

comment on column pos.sale_details.shift_id is 'Optional while register/shift operation is temporarily frozen; preserved for future re-enablement.';
comment on function public.pos_checkout(jsonb) is 'Authorized, idempotent, transactional physical-POS checkout. Active shift enforcement is temporarily frozen; canonical catalog, inventory, order, payment, invoice, and accounting behavior remains authoritative.';

notify pgrst, 'reload schema';
