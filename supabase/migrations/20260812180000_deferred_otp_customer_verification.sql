-- REYON Business OS: defer OTP as an order-placement requirement while
-- preserving contact verification and auditable REYON customer verification.

alter table crm.customer_profiles
  add column reyon_customer_verified_at timestamptz;

create table crm.customer_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization.organizations(id) on delete restrict,
  customer_id uuid not null references crm.customers(id) on delete restrict,
  verification_source_key text not null,
  order_id uuid not null references sales.orders(id) on delete restrict,
  occurred_at timestamptz not null default statement_timestamp(),
  recorded_at timestamptz not null default statement_timestamp(),
  constraint customer_verifications_source_approved
    check (verification_source_key = 'successful-order-delivery'),
  constraint customer_verifications_order_unique unique (customer_id, order_id)
);

create index customer_verifications_customer_occurred_idx
  on crm.customer_verifications(customer_id, occurred_at);

create trigger customer_verifications_prevent_mutation
before update or delete on crm.customer_verifications
for each row execute function crm.prevent_identity_evidence_mutation();

alter table crm.customer_verifications enable row level security;
revoke all on crm.customer_verifications from public, anon, authenticated;
grant all on crm.customer_verifications to service_role;

comment on column crm.customer_profiles.reyon_customer_verified_at is
  'REYON customer verification from a genuinely delivered/completed order; separate from OTP/contact verification.';
comment on table crm.customer_verifications is
  'Append-only evidence that a customer became REYON-verified through successful order delivery.';

create or replace function crm.resolve_checkout_customer(
  p_cart_id uuid,
  p_organization_id uuid,
  p_full_name text,
  p_phone text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  resolved_customer_id uuid;
  normalized_phone text := regexp_replace(p_phone, '[^0-9]+', '', 'g');
begin
  select customer_id into resolved_customer_id
  from commerce.carts where id = p_cart_id;

  if resolved_customer_id is not null then
    return resolved_customer_id;
  end if;

  -- Only a previously verified contact is a confident cross-cart identity match.
  select cc.customer_id into resolved_customer_id
  from crm.customer_contacts cc
  join crm.customers c on c.id = cc.customer_id
  where c.organization_id = p_organization_id
    and cc.contact_kind = 'phone'
    and cc.normalized_value = normalized_phone
    and cc.verified_at is not null
  limit 1;

  if resolved_customer_id is null then
    insert into crm.customers(organization_id)
    values (p_organization_id) returning id into resolved_customer_id;

    insert into crm.customer_profiles(customer_id, full_name)
    values (resolved_customer_id, btrim(p_full_name));

    insert into crm.customer_contacts(
      customer_id, contact_kind, contact_value, normalized_value
    ) values (
      resolved_customer_id, 'phone', btrim(p_phone), normalized_phone
    );

    insert into crm.external_identities(
      organization_id, customer_id, source_namespace, source_reference,
      idempotency_key
    ) values (
      p_organization_id, resolved_customer_id, 'checkout-cart', p_cart_id::text,
      'checkout-customer:' || p_cart_id::text
    );

    insert into crm.customer_events(
      organization_id, customer_id, sequence_number, event_type_key,
      occurred_at, reason, rule_version, idempotency_key
    ) values (
      p_organization_id, resolved_customer_id, 1, 'profile-created',
      statement_timestamp(), 'Successful checkout order creation',
      'sprint-15-otp-deferred-v1', 'customer-profile:' || p_cart_id::text
    );
  end if;

  update commerce.carts set customer_id = resolved_customer_id
  where id = p_cart_id and customer_id is null;
  return resolved_customer_id;
end;
$$;

revoke all on function crm.resolve_checkout_customer(uuid, uuid, text, text)
  from public, anon, authenticated;

create or replace function public.checkout_order_state(p_access_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select jsonb_build_object(
  'addressSaved', a.cart_id is not null,
  'deliverySelected', dz.id is not null,
  'deliveryZoneId', dz.id,
  'deliveryZoneName', dz.name,
  'deliveryCharge', dz.charge_amount,
  'currency', coalesce(dz.currency_code, 'BDT'),
  'paymentSelected', pm.id is not null,
  'paymentMethodId', pm.id,
  'paymentMethodName', pm.name,
  'identityVerified', coalesce(identity_check.verified, false),
  'existingOrderId', co.order_id,
  'ready', a.cart_id is not null and dz.id is not null and pm.id is not null
    and co.order_id is null
) from commerce.carts c
left join commerce.checkout_addresses a on a.cart_id = c.id
left join commerce.checkout_delivery_selections ds on ds.cart_id = c.id
left join fulfillment.delivery_zones dz on dz.id = ds.zone_id
  and dz.is_enabled and dz.charge_amount is not null
left join commerce.checkout_payment_selections ps on ps.cart_id = c.id
left join payments.checkout_methods pm on pm.id = ps.method_id
  and pm.is_visible and pm.is_selectable
left join commerce.cart_orders co on co.cart_id = c.id
left join lateral (
  select exists (
    select 1 from crm.customer_contacts cc
    where cc.customer_id = c.customer_id and cc.verified_at is not null
  ) verified
) identity_check on true
where c.access_token = p_access_token and c.expires_at > statement_timestamp();
$$;

-- Keep the already-released transactional order implementation intact and
-- replace only its obsolete verified-contact gate with profile resolution.
do $$
declare
  function_definition text;
  old_gate constant text := 'if cart.customer_id is null or not exists(select 1 from crm.customer_contacts where customer_id=cart.customer_id and verified_at is not null) then raise exception ''Verified customer identity is required.'';end if;';
  new_gate constant text := 'cart.customer_id := crm.resolve_checkout_customer(cart.id,v_org_id,address.full_name,address.phone);';
begin
  select pg_get_functiondef('public.checkout_confirm_order(uuid)'::regprocedure)
  into function_definition;
  if position(old_gate in function_definition) = 0 then
    raise exception 'Expected checkout identity gate was not found; migration stopped safely.';
  end if;
  function_definition := replace(function_definition, old_gate, new_gate);
  -- Customer resolution needs organization and address after both are loaded.
  function_definition := replace(function_definition, new_gate, '');
  function_definition := replace(
    function_definition,
    'join organization.locations l on l.organization_id=o.id and l.code=''main-inventory'' where o.code=''reyon-online'';',
    'join organization.locations l on l.organization_id=o.id and l.code=''main-inventory'' where o.code=''reyon-online''; cart.customer_id := crm.resolve_checkout_customer(cart.id,v_org_id,address.full_name,address.phone);'
  );
  if position('crm.resolve_checkout_customer' in function_definition) = 0 then
    raise exception 'Checkout customer resolution could not be installed safely.';
  end if;
  execute function_definition;
end;
$$;

comment on function public.checkout_confirm_order(uuid) is
  'Transactional checkout confirmation: creates or associates an unverified customer profile, revalidates checkout facts, snapshots the order, and creates auditable 30-minute stock reservations. OTP is deferred and is never simulated.';

create or replace function crm.verify_customer_after_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  order_customer_id uuid;
  order_organization_id uuid;
begin
  if new.to_state_key not in ('delivered', 'completed') then
    return new;
  end if;

  select customer_id, organization_id
  into order_customer_id, order_organization_id
  from sales.orders where id = new.order_id;

  if order_customer_id is null then
    return new;
  end if;

  insert into crm.customer_verifications(
    organization_id, customer_id, verification_source_key, order_id, occurred_at
  ) values (
    order_organization_id, order_customer_id,
    'successful-order-delivery', new.order_id, new.occurred_at
  ) on conflict (customer_id, order_id) do nothing;

  update crm.customer_profiles
  set reyon_customer_verified_at = coalesce(reyon_customer_verified_at, new.occurred_at),
      updated_at = statement_timestamp()
  where customer_id = order_customer_id;

  return new;
end;
$$;

revoke all on function crm.verify_customer_after_delivery()
  from public, anon, authenticated;

create trigger order_delivery_verifies_customer
after insert on sales.order_transitions
for each row execute function crm.verify_customer_after_delivery();

