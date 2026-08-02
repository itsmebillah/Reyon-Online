-- REYON Business OS: guided Product Management entry and publication.

create or replace function public.admin_catalog_options()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when public.is_reyon_admin() then jsonb_build_object(
    'brands', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug) order by name) from catalog.brands where archived_at is null), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'parentId', parent_id) order by display_order, name) from catalog.categories where archived_at is null), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug, 'status', p.status, 'brand', b.name, 'category', c.name) order by p.created_at desc) from catalog.products p join catalog.brands b on b.id=p.brand_id join catalog.product_categories pc on pc.product_id=p.id and pc.is_primary join catalog.categories c on c.id=pc.category_id), '[]'::jsonb)
  ) else null end;
$$;

create or replace function public.admin_publish_product(p_product_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare current_status text; actor text := coalesce(auth.jwt()->>'email', auth.uid()::text);
begin
  if not public.is_reyon_admin() then raise exception 'Administrator access required.'; end if;
  select status into current_status from catalog.products where id=p_product_id;
  if current_status='draft' then perform catalog.transition_product_status(p_product_id,'draft','review',actor,'Submitted by administrator'); current_status:='review'; end if;
  if current_status='review' then perform catalog.transition_product_status(p_product_id,'review','approved',actor,'Approved by administrator'); current_status:='approved'; end if;
  if current_status='approved' then perform catalog.transition_product_status(p_product_id,'approved','published',actor,'Published by administrator'); current_status:='published'; end if;
  if current_status<>'published' then raise exception 'Only Draft, Review, or Approved products can be published.'; end if;
end;
$$;

revoke all on function public.admin_publish_product(uuid) from public, anon;
grant execute on function public.admin_publish_product(uuid) to authenticated;
