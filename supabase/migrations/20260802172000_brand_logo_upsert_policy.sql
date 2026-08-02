-- Allow authenticated REYON administrators to inspect only brand-logo objects
-- so conflict-safe replacement uploads can complete.
create policy "REYON admins read brand logos" on storage.objects for select to authenticated
using (bucket_id = 'brand-logos' and public.is_reyon_admin());
