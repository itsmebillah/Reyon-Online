-- POS commerce remains authoritative while accounting activation is optional.
-- Inactive accounting records immutable pending-posting evidence instead of
-- rolling back the canonical order, payment, inventory, invoice, and receipt.

create or replace function accounting.post_completed_sale_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_channel_code text;
begin
  select o.organization_id, channel.code
    into v_organization_id, v_channel_code
  from sales.orders o
  join organization.channels channel on channel.id = o.channel_id
  where o.id = new.order_id;

  if v_channel_code = 'physical-pos' and not exists (
    select 1
    from accounting.organization_profiles profile
    where profile.organization_id = v_organization_id
      and profile.posting_enabled
      and profile.activated_at is not null
  ) then
    insert into accounting.posting_exceptions(
      source_namespace,
      source_reference,
      exception_key,
      detail
    ) values (
      'completed-sale',
      new.id::text,
      'configuration-inactive',
      'Accounting configuration is inactive or incomplete; the canonical sale remains unposted.'
    ) on conflict do nothing;
    return new;
  end if;

  perform accounting.post_completed_sale(new.id);
  return new;
end;
$$;

revoke all on function accounting.post_completed_sale_trigger()
  from public, anon, authenticated;

comment on function accounting.post_completed_sale_trigger() is
  'Posts configured Completed sales and otherwise records immutable pending-posting evidence without blocking canonical commerce.';

notify pgrst, 'reload schema';
