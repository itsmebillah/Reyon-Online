-- REYON Business OS: Sprint 15 manual payment step correction.

alter table payments.checkout_methods
  drop constraint if exists card_not_manual_success;

update payments.checkout_methods
set is_selectable=true,
  instructions=coalesce(instructions,'Card payment is recorded for manual follow-up. No card details are collected on this website.'),
  updated_at=statement_timestamp()
where method_key='card';

create or replace function public.admin_update_payment_method(
  p_method_id uuid,p_is_visible boolean,p_is_selectable boolean,p_instructions text,p_account_reference text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.';end if;
  update payments.checkout_methods set
    is_visible=p_is_visible,is_selectable=p_is_selectable,
    instructions=nullif(btrim(p_instructions),''),account_reference=nullif(btrim(p_account_reference),''),
    updated_at=statement_timestamp()
  where id=p_method_id;
  if not found then raise exception 'Payment method not found.';end if;
end$$;

comment on constraint selectable_mobile_config on payments.checkout_methods is
  'Mobile methods require administrator-configured instructions and account reference before selection. Card may be selected for manual pending follow-up but never records gateway success.';
