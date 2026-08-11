-- REYON Business OS: approved one-step Product publication controls.

create or replace function public.admin_transition_product(
  p_product_id uuid,
  p_target_status text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  current_status text;
  actor text := coalesce(auth.jwt()->>'email', auth.uid()::text);
  reason text;
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  select status into current_status from catalog.products where id=p_product_id;
  if current_status is null then raise exception 'Product does not exist.'; end if;
  reason := case p_target_status
    when 'review' then 'Submitted for review by administrator'
    when 'approved' then 'Approved by administrator'
    when 'published' then 'Published by administrator'
    when 'hidden' then 'Hidden by administrator'
    when 'archived' then 'Archived by administrator'
    else null
  end;
  if reason is null then raise exception 'Target status is not an approved administrator action.'; end if;
  perform catalog.transition_product_status(p_product_id, current_status, p_target_status, actor, reason);
end;
$$;

revoke all on function public.admin_transition_product(uuid,text) from public, anon;
grant execute on function public.admin_transition_product(uuid,text) to authenticated;
